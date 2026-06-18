// Stage 6 helper — resize to 1600px (orientation baked in) and strip all EXIF,
// writing a lossless PNG. export_web.py then encodes a SINGLE-TILE AVIF from it
// via ffmpeg. (ImageIO's own AVIF writer tiles anything >512px into a grid that
// Firefox can't decode; Chrome/Safari can.) LOCAL ONLY.
// Usage:  swift export_avif.swift <jobs.tsv>
// jobs.tsv lines: <absolute-src-path>\t<absolute-out-path.png>
import Foundation
import ImageIO
import CoreGraphics

let PNG = "public.png" as CFString
let MAXPX = 1600

let jobsPath = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "/tmp/jobs.tsv"
let lines = (try? String(contentsOfFile: jobsPath, encoding: .utf8))?
    .split(separator: "\n").map(String.init) ?? []
var done = 0
for line in lines {
    let parts = line.components(separatedBy: "\t")
    guard parts.count == 2 else { continue }
    let (src, out) = (parts[0], parts[1])
    guard let s = CGImageSourceCreateWithURL(URL(fileURLWithPath: src) as CFURL, nil) else {
        FileHandle.standardError.write("decode fail: \(src)\n".data(using: .utf8)!); continue
    }
    let opts: [CFString: Any] = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true,   // bakes EXIF orientation
        kCGImageSourceThumbnailMaxPixelSize: MAXPX,
    ]
    guard let cg = CGImageSourceCreateThumbnailAtIndex(s, 0, opts as CFDictionary) else {
        FileHandle.standardError.write("thumb fail: \(src)\n".data(using: .utf8)!); continue
    }
    guard let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: out) as CFURL, PNG, 1, nil) else {
        FileHandle.standardError.write("png dest fail: \(out)\n".data(using: .utf8)!); continue
    }
    CGImageDestinationAddImage(dest, cg, nil)   // lossless; lossy AVIF encode happens in ffmpeg
    if CGImageDestinationFinalize(dest) {   // no metadata dict added -> EXIF stripped
        done += 1
    } else {
        FileHandle.standardError.write("finalize fail: \(out)\n".data(using: .utf8)!)
    }
}
print("wrote \(done)/\(lines.count) PNGs (resized, oriented, EXIF-stripped)")
