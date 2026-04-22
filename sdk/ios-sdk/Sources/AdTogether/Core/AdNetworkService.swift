import Foundation
#if canImport(UIKit)
import UIKit
#endif

internal class AdNetworkService {
    
    static func fetchAd(adUnitId: String, adType: String? = nil, exclude: String? = nil, allowSelfAds: Bool = true, completion: @escaping (Result<AdModel, Error>) -> Void) {
        var urlString = "\(AdTogether.shared.baseUrl)/api/ads/serve?country=global&adUnitId=\(adUnitId)&apiKey=\(AdTogether.shared.appId ?? "")"
        if let adType = adType {
            urlString += "&adType=\(adType)"
        }
        if let exclude = exclude {
            urlString += "&exclude=\(exclude)"
        }
        if let bundleId = AdTogether.shared.bundleId {
            urlString += "&bundleId=\(bundleId)"
        }
        urlString += "&allowSelfAds=\(allowSelfAds)"
        guard let url = URL(string: urlString) else {
            completion(.failure(NSError(domain: "AdTogether", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(NSError(domain: "AdTogether", code: -2, userInfo: [NSLocalizedDescriptionKey: "No data received"])))
                return
            }
            
            do {
                let decoder = JSONDecoder()
                let ad = try decoder.decode(AdModel.self, from: data)
                completion(.success(ad))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
    
    static func trackImpression(adId: String, token: String?) {
        trackEvent(endpoint: "/api/ads/impression", adId: adId, token: token)
    }
    
    static func trackClick(adId: String, token: String?) {
        trackEvent(endpoint: "/api/ads/click", adId: adId, token: token)
    }
    
    private static func trackEvent(endpoint: String, adId: String, token: String?) {
        let urlString = "\(AdTogether.shared.baseUrl)\(endpoint)"
        guard let url = URL(string: urlString) else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        var body: [String: String] = ["adId": adId]
        if let token = token {
            body["token"] = token
        }
        if let apiKey = AdTogether.shared.appId {
            body["apiKey"] = apiKey
        }
        if let bundleId = AdTogether.shared.bundleId {
            body["bundleId"] = bundleId
        }
        // Send platform and app metadata to match Flutter SDK
        #if os(iOS)
        body["platform"] = "ios"
        #elseif os(macOS)
        body["platform"] = "macos"
        #elseif os(tvOS)
        body["platform"] = "tvos"
        #elseif os(watchOS)
        body["platform"] = "watchos"
        #endif
        if let appName = AdTogether.shared.appName {
            body["appName"] = appName
        }
        if let appVersion = AdTogether.shared.appVersion {
            body["appVersion"] = appVersion
        }
        // Detect country from device locale (no permissions needed)
        if #available(iOS 16, macOS 13, tvOS 16, watchOS 9, *) {
            if let regionCode = Locale.current.region?.identifier {
                body["country"] = regionCode
            }
        } else {
            if let regionCode = Locale.current.regionCode {
                body["country"] = regionCode
            }
        }
        #if DEBUG
        body["environment"] = "development"
        #else
        body["environment"] = "production"
        #endif
        
        if let bodyData = try? JSONEncoder().encode(body) {
            request.httpBody = bodyData
            URLSession.shared.dataTask(with: request).resume()
        }
    }
}
