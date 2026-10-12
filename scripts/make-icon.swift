import AppKit
import Foundation

let size = 1024
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
NSGraphicsContext.current?.imageInterpolation = .high

NSColor.clear.setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: size, height: size)).fill()
let background = NSBezierPath(roundedRect: NSRect(x: 45, y: 45, width: 934, height: 934), xRadius: 215, yRadius: 215)
NSColor(calibratedRed: 35/255, green: 53/255, blue: 47/255, alpha: 1).setFill()
background.fill()

NSGraphicsContext.saveGraphicsState()
let transform = NSAffineTransform()
transform.translateX(by: 512, yBy: 512)
transform.rotate(byDegrees: -9)
transform.concat()
let barColor = NSColor(calibratedRed: 220/255, green: 239/255, blue: 224/255, alpha: 1)
let bars: [(CGFloat, CGFloat)] = [(-190, 250), (0, 390), (190, 305)]
for (x, height) in bars {
    let bar = NSBezierPath(roundedRect: NSRect(x: x - 34, y: -height/2, width: 68, height: height), xRadius: 34, yRadius: 34)
    barColor.setFill()
    bar.fill()
}
NSGraphicsContext.restoreGraphicsState()
NSGraphicsContext.restoreGraphicsState()

let png = bitmap.representation(using: .png, properties: [:])!
let output = CommandLine.arguments.dropFirst().first ?? "/tmp/traza-bizkaia-icon.png"
try png.write(to: URL(fileURLWithPath: output))
