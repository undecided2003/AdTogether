import Foundation

internal class AdNetworkService {
    
    static func fetchAd(adUnitId: String, completion: @escaping (Result<AdModel, Error>) -> Void) {
        let urlString = "\(AdTogether.shared.baseUrl)/api/ads/serve?country=global&adUnitId=\(adUnitId)"
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
    
    static func trackImpression(adId: String) {
        trackEvent(endpoint: "/api/ads/impression", adId: adId)
    }
    
    static func trackClick(adId: String) {
        trackEvent(endpoint: "/api/ads/click", adId: adId)
    }
    
    private static func trackEvent(endpoint: String, adId: String) {
        let urlString = "\(AdTogether.shared.baseUrl)\(endpoint)"
        guard let url = URL(string: urlString) else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = ["adId": adId]
        if let bodyData = try? JSONEncoder().encode(body) {
            request.httpBody = bodyData
            URLSession.shared.dataTask(with: request).resume()
        }
    }
}
