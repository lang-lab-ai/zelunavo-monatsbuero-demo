import AppKit
import PDFKit
import Vision

let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let document = PDFDocument(url: url) else {
    fputs("Could not open PDF\n", stderr)
    exit(2)
}

for index in 0..<document.pageCount {
    guard let page = document.page(at: index) else { continue }
    let image = page.thumbnail(of: CGSize(width: 1700, height: 2200), for: .mediaBox)
    guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.recognitionLanguages = ["de-DE", "en-US"]
    do {
        try VNImageRequestHandler(cgImage: cgImage).perform([request])
        let lines = (request.results ?? [])
            .sorted { $0.boundingBox.midY > $1.boundingBox.midY }
            .compactMap { $0.topCandidates(1).first?.string }
        print("<<<PAGE:\(index + 1)>>> \(lines.joined(separator: "\n"))")
    } catch {
        print("<<<PAGE:\(index + 1)>>> ")
    }
}
