// Prepare a photo for the website.
//
//   swift tools/prep_photo.swift <input> <output.jpg> [max-edge-px]
//
// Reads anything macOS can open (HEIC, JPEG, PNG, ...), turns it upright
// using the camera's orientation tag, shrinks it so the long edge is at most
// 1600 px (or the given size), and writes a JPEG at quality 0.82.
//
// Only the pixels and colour profile are written: camera details, dates and
// GPS location are left behind, so a phone photo never publishes where it
// was taken.

import Foundation
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count == 3 || args.count == 4 else {
    FileHandle.standardError.write("usage: swift tools/prep_photo.swift <input> <output.jpg> [max-edge-px]\n".data(using: .utf8)!)
    exit(2)
}
let inURL = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])
let maxEdge = args.count == 4 ? (Int(args[3]) ?? 1600) : 1600

guard let source = CGImageSourceCreateWithURL(inURL as CFURL, nil) else {
    FileHandle.standardError.write("cannot open \(inURL.path)\n".data(using: .utf8)!)
    exit(1)
}

// Never upscale: cap at the original's long edge.
var limit = maxEdge
if let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
   let w = props[kCGImagePropertyPixelWidth] as? Int,
   let h = props[kCGImagePropertyPixelHeight] as? Int {
    limit = min(maxEdge, max(w, h))
}

let thumbOptions: [CFString: Any] = [
    kCGImageSourceCreateThumbnailFromImageAlways: true,
    kCGImageSourceCreateThumbnailWithTransform: true,   // apply orientation
    kCGImageSourceThumbnailMaxPixelSize: limit,
]
guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, thumbOptions as CFDictionary) else {
    FileHandle.standardError.write("cannot decode \(inURL.path)\n".data(using: .utf8)!)
    exit(1)
}

guard let dest = CGImageDestinationCreateWithURL(outURL as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else {
    FileHandle.standardError.write("cannot write \(outURL.path)\n".data(using: .utf8)!)
    exit(1)
}
let writeOptions: [CFString: Any] = [kCGImageDestinationLossyCompressionQuality: 0.82]
CGImageDestinationAddImage(dest, image, writeOptions as CFDictionary)
guard CGImageDestinationFinalize(dest) else {
    FileHandle.standardError.write("write failed \(outURL.path)\n".data(using: .utf8)!)
    exit(1)
}
print("\(outURL.path)  \(image.width)x\(image.height)")
