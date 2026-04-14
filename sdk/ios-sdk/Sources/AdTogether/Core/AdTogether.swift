import Foundation
import os.log

public final class AdTogether {
    
    // Shared instance
    static let shared = AdTogether()
    
    private(set) var appId: String?
    private(set) var baseUrl: String = "https://adtogether.relaxsoftwareapps.com"
    private(set) var lastAdId: String?
    
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
    
    /// Fetches an ad for a specific ad unit.
    /// - Parameters:
    ///   - adUnitId: The unique identifier for the ad placement.
    ///   - adType: Optional ad type filter, either "banner" or "interstitial".
    ///   - completion: Completeness block with Result containing AdModel or Error.
    public static func fetchAd(adUnitId: String, adType: String? = nil, completion: @escaping (Result<AdModel, Error>) -> Void) {
        guard shared.assertInitialized() else {
            completion(.failure(NSError(domain: "AdTogether", code: -1, userInfo: [NSLocalizedDescriptionKey: "SDK not initialized"])))
            return
        }
        
        AdNetworkService.fetchAd(adUnitId: adUnitId, adType: adType, exclude: shared.lastAdId) { result in
            if case .success(let ad) = result {
                shared.lastAdId = ad.id
            }
            completion(result)
        }
    }
    
    /// Tracks an impression for a specific ad.
    public static func trackImpression(adId: String, token: String?) {
        guard shared.assertInitialized() else { return }
        AdNetworkService.trackImpression(adId: adId, token: token)
    }
    
    /// Tracks a click for a specific ad.
    public static func trackClick(adId: String, token: String?) {
        guard shared.assertInitialized() else { return }
        AdNetworkService.trackClick(adId: adId, token: token)
    }
}
