// Run on macOS: swift -module-cache-path /tmp/gemba-icons-cache scripts/generate-pwa-icons.swift
// Package the existing sidebar G asset without redrawing or retouching it.
import Foundation
import CoreGraphics
import ImageIO
let root = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : FileManager.default.currentDirectoryPath
let sourceURL = URL(fileURLWithPath: root + "/public/logos/Giqlogo.png")
guard let decoder = CGImageSourceCreateWithURL(sourceURL as CFURL, nil), let source = CGImageSourceCreateImageAtIndex(decoder, 0, nil) else { fatalError("Cannot read sidebar G logo") }
let target = root + "/public/icons"
try FileManager.default.createDirectory(atPath: target, withIntermediateDirectories: true)
for (name, size, fraction) in [("gemba-g-192.png",192,0.76),("gemba-g-512.png",512,0.76),("gemba-g-maskable-512.png",512,0.56),("apple-touch-icon-180.png",180,0.76),("favicon-32.png",32,0.82)] {
 guard let context = CGContext(data:nil,width:size,height:size,bitsPerComponent:8,bytesPerRow:size*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipLast.rawValue) else { fatalError("Cannot create icon bitmap") }
 context.setFillColor(CGColor(red:1,green:1,blue:1,alpha:1));context.fill(CGRect(x:0,y:0,width:size,height:size));context.interpolationQuality = .high
 let scale = Double(size)*fraction/Double(max(source.width,source.height))
 let w=Double(source.width)*scale,h=Double(source.height)*scale
 context.draw(source,in:CGRect(x:(Double(size)-w)/2,y:(Double(size)-h)/2,width:w,height:h))
 let output=URL(fileURLWithPath:target+"/"+name)
 guard let image=context.makeImage(),let destination=CGImageDestinationCreateWithURL(output as CFURL,"public.png" as CFString,1,nil) else { fatalError("Cannot encode icon") }
 CGImageDestinationAddImage(destination,image,nil)
 guard CGImageDestinationFinalize(destination) else { fatalError("Cannot write icon") }
 print(name+" "+String(size)+"x"+String(size))
}
