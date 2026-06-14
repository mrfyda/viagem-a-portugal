// Stage 2 — on-device people/face detection (macOS Vision). LOCAL ONLY: pixels
// never leave the machine. Usage:  swift detect_people.swift "/path/to/journey folder"
// Writes <photos>/_journey/people.json: [{file, faces, persons, maxFaceArea, maxPersonArea}].
import Foundation
import Vision
import ImageIO
import CoreGraphics

let dir = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : FileManager.default.currentDirectoryPath
let fm = FileManager.default
let outDir = dir + "/_journey"
try? fm.createDirectory(atPath: outDir, withIntermediateDirectories: true)
let files = (try? fm.contentsOfDirectory(atPath: dir))?
    .filter { $0.lowercased().hasSuffix(".heic") || $0.lowercased().hasSuffix(".jpg") || $0.lowercased().hasSuffix(".jpeg") }
    .sorted() ?? []

func orientation(_ url: URL) -> CGImagePropertyOrientation {
    guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
          let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any],
          let raw = props[kCGImagePropertyOrientation] as? UInt32,
          let o = CGImagePropertyOrientation(rawValue: raw) else { return .up }
    return o
}

var out: [[String: Any]] = []
FileHandle.standardError.write("Detecting people in \(files.count) photos...\n".data(using: .utf8)!)
for (i, name) in files.enumerated() {
    let url = URL(fileURLWithPath: dir + "/" + name)
    guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
          let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
        out.append(["file": name, "error": "decode"]); continue
    }
    let faceReq = VNDetectFaceRectanglesRequest()
    let humanReq = VNDetectHumanRectanglesRequest()
    let handler = VNImageRequestHandler(cgImage: cg, orientation: orientation(url), options: [:])
    var faces = 0, persons = 0, maxFace = 0.0, maxPerson = 0.0
    do {
        try handler.perform([faceReq, humanReq])
        for f in (faceReq.results ?? []) where f.confidence > 0.3 {
            faces += 1; maxFace = max(maxFace, Double(f.boundingBox.width * f.boundingBox.height))
        }
        for h in (humanReq.results ?? []) where h.confidence > 0.4 {
            persons += 1; maxPerson = max(maxPerson, Double(h.boundingBox.width * h.boundingBox.height))
        }
    } catch {
        out.append(["file": name, "error": "\(error)"]); continue
    }
    out.append(["file": name, "faces": faces, "persons": persons,
                "maxFaceArea": (maxFace*1000).rounded()/1000,
                "maxPersonArea": (maxPerson*1000).rounded()/1000])
    if (i+1) % 50 == 0 { FileHandle.standardError.write("  \(i+1)/\(files.count)\n".data(using: .utf8)!) }
}
let data = try JSONSerialization.data(withJSONObject: out, options: [.prettyPrinted])
try data.write(to: URL(fileURLWithPath: outDir + "/people.json"))
FileHandle.standardError.write("done -> \(outDir)/people.json\n".data(using: .utf8)!)
