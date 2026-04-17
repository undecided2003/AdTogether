import Foundation
import CoreGraphics

public struct AdSize {
    public let width: CGFloat
    public let height: CGFloat
    
    public init(width: CGFloat, height: CGFloat) {
        self.width = width
        self.height = height
    }
    
    public static let banner = AdSize(width: 320, height: 50)
    public static let largeBanner = AdSize(width: 320, height: 100)
    public static let mediumRectangle = AdSize(width: 300, height: 250)
    public static let fullBanner = AdSize(width: 468, height: 60)
    public static let leaderboard = AdSize(width: 728, height: 90)
    
    public static let fluid = AdSize(width: -1, height: -1)
    
    public var isFluid: Bool {
        return width == -1 && height == -1
    }
}
