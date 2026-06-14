// Stage 6 helper — resize to 1600px (orientation baked in), strip all EXIF, and
// encode AVIF via ImageIO (macOS has no local webp encoder; AVIF is smaller and
// well-supported). LOCAL ONLY. Usage:  swift export_avif.swift <jobs.tsv>
// jobs.tsv lines: <absolute-src-path>\t<absolute-out-path.avif>
import Foundation
import ImageIO
import CoreGraphics

let AVIF = "public.avif" as CFString
let MAXPX = 1600
let Q = 0.72

let jobsPath = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "/tmp/jobs.tsv"
let lines = (try? String(contentsOfFile: jobsPath, encoding: .utf8))?
    .split(separator: "\n").map(String.init) ?? []
var done = 0, totalIn = 0, totalOut = 0
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
    guard let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: out) as CFURL, AVIF, 1, nil) else {
        FileHandle.standardError.write("avif dest fail: \(out)\n".data(using: .utf8)!); continue
    }
    CGImageDestinationAddImage(dest, cg, [kCGImageDestinationLossyCompressionQuality: Q] as CFDictionary)
    if CGImageDestinationFinalize(dest) {   // no metadata dict added -> EXIF stripped
        done += 1
        totalIn  += (try? FileManager.default.attributesOfItem(atPath: src)[.size] as? Int ?? 0) ?? 0
        totalOut += (try? FileManager.default.attributesOfItem(atPath: out)[.size] as? Int ?? 0) ?? 0
    } else {
        FileHandle.standardError.write("finalize fail: \(out)\n".data(using: .utf8)!)
    }
}
print("encoded \(done)/\(lines.count) to AVIF")
print(String(format: "source: %.1f MB -> AVIF: %.1f MB (%.0f%% smaller)",
    Double(totalIn)/1e6, Double(totalOut)/1e6, 100*(1 - Double(totalOut)/Double(max(1, totalIn)))))
