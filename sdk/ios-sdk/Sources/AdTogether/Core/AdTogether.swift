import Foundation
import os.log

public final class AdTogether {
    
    // Shared instance
    static let shared = AdTogether()
    
    private(set) var appId: String?
    private(set) var baseUrl: String = "https://adtogether.relaxsoftwareapps.com"
    
    let logger = Logger(subsystem: "com.adtogether.sdk", category: "Core")
    
    private init() {}
    
    /// Initializes the AdTogether SDK.
    /// - Parameters:
    ///   - appId: Your registered application ID.
    ///   - baseUrl: (Optional) Override the base URL for testing purposes.
    public static func initialize(appId: String, baseUrl: String? = nil) {
        shared.appId = appId
        if let overrideUrl = baseUrl {
            shared.baseUrl = overrideUrl
        }
        shared.logger.info("AdTogether SDK Initialized with App ID: \(appId)")
    }
    
    internal func assertInitialized() -> Bool {
        if appId == nil {
            logger.error("AdTogether Error: SDK has not been initialized. Please call AdTogether.initialize() before displaying ads.")
            return false
        }
        return true
    }
}
