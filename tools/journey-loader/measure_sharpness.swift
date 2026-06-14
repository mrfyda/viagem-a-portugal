// Stage 3 — sharpness (variance of Laplacian) + brightness, on-device via
// CoreImage/CGContext. LOCAL ONLY. Usage:  swift measure_sharpness.swift "/path/to/journey folder"
// Writes <photos>/_journey/quality.json: [{file, sharp, bright}].
import Foundation
import ImageIO
import CoreGraphics

let dir = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : FileManager.default.currentDirectoryPath
let fm = FileManager.default
let outDir = dir + "/_journey"
try? fm.createDirectory(atPath: outDir, withIntermediateDirectories: true)
let files = (try? fm.contentsOfDirectory(atPath: dir))?
    .filter { $0.lowercased().hasSuffix(".heic") || $0.lowercased().hasSuffix(".jpg") || $0.lowercased().hasSuffix(".jpeg") }
    .sorted() ?? []

func grayBuffer(_ cg: CGImage, maxDim: Int) -> ([UInt8], Int, Int)? {
    let scale = Double(maxDim) / Double(max(cg.width, cg.height))
    let w = max(1, Int(Double(cg.width) * min(1.0, scale)))
    let h = max(1, Int(Double(cg.height) * min(1.0, scale)))
    let cs = CGColorSpaceCreateDeviceGray()
    guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8,
            bytesPerRow: w, space: cs, bitmapInfo: CGImageAlphaInfo.none.rawValue) else { return nil }
    ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
    guard let data = ctx.data else { return nil }
    let ptr = data.bindMemory(to: UInt8.self, capacity: w*h)
    return (Array(UnsafeBufferPointer(start: ptr, count: w*h)), w, h)
}

var out: [[String: Any]] = []
FileHandle.standardError.write("Sharpness/exposure for \(files.count) photos...\n".data(using: .utf8)!)
for (i, name) in files.enumerated() {
    let url = URL(fileURLWithPath: dir + "/" + name)
    guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
          let cg = CGImageSourceCreateImageAtIndex(src, 0, nil),
          let (buf, w, h) = grayBuffer(cg, maxDim: 384) else {
        out.append(["file": name, "error": "decode"]); continue
    }
    var sum = 0.0; for v in buf { sum += Double(v) }
    let bright = sum / Double(w*h)
    var lsum = 0.0, lsumSq = 0.0, cnt = 0.0
    for y in 1..<(h-1) {
        for x in 1..<(w-1) {
            let lap = Double(Int(buf[(y-1)*w+x]) + Int(buf[(y+1)*w+x])
                           + Int(buf[y*w+x-1]) + Int(buf[y*w+x+1]) - 4*Int(buf[y*w+x]))
            lsum += lap; lsumSq += lap*lap; cnt += 1
        }
    }
    let lmean = lsum/cnt
    let sharp = lsumSq/cnt - lmean*lmean
    out.append(["file": name, "sharp": (sharp*10).rounded()/10, "bright": (bright*10).rounded()/10])
    if (i+1) % 100 == 0 { FileHandle.standardError.write("  \(i+1)/\(files.count)\n".data(using: .utf8)!) }
}
let data = try JSONSerialization.data(withJSONObject: out)
try data.write(to: URL(fileURLWithPath: outDir + "/quality.json"))
FileHandle.standardError.write("done -> \(outDir)/quality.json\n".data(using: .utf8)!)
