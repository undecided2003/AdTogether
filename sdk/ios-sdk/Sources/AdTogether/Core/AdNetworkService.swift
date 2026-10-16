import Foundation
#if os(iOS) && !targetEnvironment(macCatalyst)
import CryptoKit
import DeviceCheck
import Security
#endif
#if canImport(UIKit)
import UIKit
#endif

internal class AdNetworkService {
    
    static func fetchAd(adUnitId: String = "default", adType: String? = nil, exclude: String? = nil, allowSelfAds: Bool = true, completion: @escaping (Result<AdModel, Error>) -> Void) {
        #if targetEnvironment(macCatalyst)
        let platform = "macos"
        #elseif os(iOS)
        let platform = "ios"
        #elseif os(macOS)
        let platform = "macos"
        #elseif os(tvOS)
        let platform = "tvos"
        #elseif os(watchOS)
        let platform = "watchos"
        #else
        let platform = "unknown"
        #endif
        guard var components = URLComponents(string: AdTogether.shared.baseUrl) else {
            completion(.failure(NSError(domain: "AdTogether", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }
        let basePath = components.path.hasSuffix("/") ? String(components.path.dropLast()) : components.path
        components.path = "\(basePath)/api/ads/serve"
        components.fragment = nil
        var queryItems = [
            URLQueryItem(name: "adUnitId", value: adUnitId),
            URLQueryItem(name: "appId", value: AdTogether.shared.appId ?? ""),
            URLQueryItem(name: "platform", value: platform),
            URLQueryItem(name: "allowSelfAds", value: String(allowSelfAds)),
        ]
        if let adType = adType {
            queryItems.append(URLQueryItem(name: "adType", value: adType))
        }
        if let exclude = exclude {
            queryItems.append(URLQueryItem(name: "exclude", value: exclude))
        }
        if let bundleId = AdTogether.shared.bundleId {
            queryItems.append(URLQueryItem(name: "bundleId", value: bundleId))
        }
        components.queryItems = queryItems
        guard let url = components.url else {
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
            
            if let httpResponse = response as? HTTPURLResponse {
                if httpResponse.statusCode == 401 || httpResponse.statusCode == 403 {
                    print("AdTogether Error: Invalid App ID. Please check your dashboard.")
                    completion(.failure(NSError(domain: "AdTogether", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "Invalid App ID"])))
                    return
                }
            }
            
            guard let data = data else {
                completion(.failure(NSError(domain: "AdTogether", code: -2, userInfo: [NSLocalizedDescriptionKey: "No data received"])))
                return
            }
            
            do {
                let decoder = JSONDecoder()
                let ad = try decoder.decode(AdModel.self, from: data)
                if let adType = adType, ad.adType != adType {
                    completion(.failure(NSError(domain: "AdTogether", code: -3, userInfo: [NSLocalizedDescriptionKey: "Received an ad with a different type than requested"])))
                    return
                }
                completion(.success(ad))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
    
    static func trackImpression(
        adId: String,
        token: String?,
        nativeAttestation: String? = nil,
        visiblePercent: Int? = nil,
        visibleDurationMs: Int? = nil
    ) {
        #if os(iOS) && !targetEnvironment(macCatalyst)
        if nativeAttestation == "app-attest", let token = token {
            let attestationAppId = AdTogether.shared.appId
            prepareAppAttestProof(grantToken: token) { proof in
                guard let proof = proof else {
                    AdTogether.shared.logger.error("Could not generate App Attest proof; impression was not submitted")
                    return
                }
                trackEvent(
                    endpoint: "/api/ads/impression",
                    adId: adId,
                    token: token,
                    attestation: proof,
                    visiblePercent: visiblePercent,
                    visibleDurationMs: visibleDurationMs
                ) { responseData, status in
                    guard let appId = attestationAppId,
                          shouldDiscardAppAttestKey(responseData: responseData, status: status) else {
                        return
                    }
                    AppAttestKeyStore.clear(for: appId)
                }
            }
            return
        }
        #endif
        trackEvent(
            endpoint: "/api/ads/impression",
            adId: adId,
            token: token,
            visiblePercent: visiblePercent,
            visibleDurationMs: visibleDurationMs
        )
    }
    
    static func trackClick(adId: String, token: String?) {
        trackEvent(endpoint: "/api/ads/click", adId: adId, token: token)
    }
    
    private static func trackEvent(
        endpoint: String,
        adId: String,
        token: String?,
        attestation: [String: String]? = nil,
        visiblePercent: Int? = nil,
        visibleDurationMs: Int? = nil,
        completion: ((Data?, Int?) -> Void)? = nil
    ) {
        let urlString = "\(AdTogether.shared.baseUrl)\(endpoint)"
        guard let url = URL(string: urlString) else {
            completion?(nil, nil)
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        var body: [String: String] = ["adId": adId]
        if let attestation = attestation {
            body.merge(attestation) { _, new in new }
        }
        if let token = token {
            body["token"] = token
        }
        if let visiblePercent = visiblePercent {
            body["visiblePercent"] = String(visiblePercent)
        }
        if let visibleDurationMs = visibleDurationMs {
            body["visibleDurationMs"] = String(visibleDurationMs)
        }
        if let appId = AdTogether.shared.appId {
            body["appId"] = appId
        }
        if let bundleId = AdTogether.shared.bundleId {
            body["bundleId"] = bundleId
        }
        // Send platform and app metadata to match Flutter SDK
        #if targetEnvironment(macCatalyst)
        body["platform"] = "macos"
        #elseif os(iOS)
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
        #if DEBUG
        body["environment"] = "development"
        #else
        body["environment"] = "production"
        #endif
        
        if let bodyData = try? JSONEncoder().encode(body) {
            request.httpBody = bodyData
            URLSession.shared.dataTask(with: request) { data, response, _ in
                completion?(data, (response as? HTTPURLResponse)?.statusCode)
            }.resume()
        } else {
            completion?(nil, nil)
        }
    }

    #if os(iOS) && !targetEnvironment(macCatalyst)
    private struct AppAttestChallenge: Decodable {
        let challengeId: String
        let challenge: String
    }

    private struct AppAttestResponseError: Decodable {
        let error: String?
        let reason: String?
    }

    private enum AppAttestRegistrationPhase: String, Codable {
        case awaitingAttestation
        case awaitingServerRegistration
        case registered
    }

    private struct AppAttestKeyState: Codable {
        let keyId: String
        let phase: AppAttestRegistrationPhase
        let challengeId: String?
        let challenge: String?
        let attestationObject: String?
        let challengeIssuedAt: TimeInterval?
    }

    private enum AppAttestKeyStore {
        private static let service = "com.adtogether.sdk.appattest"

        static func load(for appId: String) -> AppAttestKeyState? {
            var query = baseQuery(for: appId)
            query[kSecReturnData] = true
            query[kSecMatchLimit] = kSecMatchLimitOne
            var item: CFTypeRef?
            let status = SecItemCopyMatching(query as CFDictionary, &item)
            if status == errSecSuccess {
                guard let data = item as? Data,
                      let state = try? JSONDecoder().decode(AppAttestKeyState.self, from: data) else {
                    deleteKeychainEntry(for: appId)
                    return migrateLegacyState(for: appId)
                }
                return state
            }
            if status == errSecItemNotFound {
                return migrateLegacyState(for: appId)
            }
            return nil
        }

        @discardableResult
        static func save(_ state: AppAttestKeyState, for appId: String) -> Bool {
            guard let data = try? JSONEncoder().encode(state) else { return false }
            let query = baseQuery(for: appId)
            let updateStatus = SecItemUpdate(query as CFDictionary, [kSecValueData: data] as CFDictionary)
            if updateStatus == errSecSuccess { return true }
            guard updateStatus == errSecItemNotFound else { return false }

            var addQuery = query
            addQuery[kSecValueData] = data
            addQuery[kSecAttrAccessible] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            return SecItemAdd(addQuery as CFDictionary, nil) == errSecSuccess
        }

        static func clear(for appId: String) {
            deleteKeychainEntry(for: appId)
            UserDefaults.standard.removeObject(forKey: legacyDefaultsKey(for: appId))
        }

        private static func migrateLegacyState(for appId: String) -> AppAttestKeyState? {
            guard let keyId = UserDefaults.standard.string(forKey: legacyDefaultsKey(for: appId)) else {
                return nil
            }
            let state = AppAttestKeyState(
                keyId: keyId,
                phase: .registered,
                challengeId: nil,
                challenge: nil,
                attestationObject: nil,
                challengeIssuedAt: nil
            )
            if save(state, for: appId) {
                UserDefaults.standard.removeObject(forKey: legacyDefaultsKey(for: appId))
            }
            return state
        }

        private static func deleteKeychainEntry(for appId: String) {
            SecItemDelete(baseQuery(for: appId) as CFDictionary)
        }

        private static func baseQuery(for appId: String) -> [CFString: Any] {
            [
                kSecClass: kSecClassGenericPassword,
                kSecAttrService: service,
                kSecAttrAccount: Data(SHA256.hash(data: Data(appId.utf8))).base64EncodedString(),
            ]
        }

        private static func legacyDefaultsKey(for appId: String) -> String {
            "com.adtogether.appattest.key.\(appId)"
        }
    }

    private static let appAttestChallengeLifetime: TimeInterval = 4 * 60

    private static func prepareAppAttestProof(grantToken: String, completion: @escaping ([String: String]?) -> Void) {
        guard DCAppAttestService.shared.isSupported,
              let appId = AdTogether.shared.appId else {
            completion(nil)
            return
        }

        let clientDataHash = Data(SHA256.hash(data: Data(grantToken.utf8)))
        if let state = AppAttestKeyStore.load(for: appId) {
            continueAppAttestRegistration(
                state: state,
                appId: appId,
                clientDataHash: clientDataHash,
                completion: completion
            )
            return
        }

        DCAppAttestService.shared.generateKey { keyId, error in
            guard let keyId = keyId, error == nil else {
                completion(nil)
                return
            }
            let state = AppAttestKeyState(
                keyId: keyId,
                phase: .awaitingAttestation,
                challengeId: nil,
                challenge: nil,
                attestationObject: nil,
                challengeIssuedAt: nil
            )
            guard AppAttestKeyStore.save(state, for: appId) else {
                completion(nil)
                return
            }
            continueAppAttestRegistration(
                state: state,
                appId: appId,
                clientDataHash: clientDataHash,
                completion: completion
            )
        }
    }

    private static func continueAppAttestRegistration(
        state: AppAttestKeyState,
        appId: String,
        clientDataHash: Data,
        completion: @escaping ([String: String]?) -> Void
    ) {
        switch state.phase {
        case .registered:
            generateAssertion(keyId: state.keyId, appId: appId, clientDataHash: clientDataHash, completion: completion)
        case .awaitingAttestation:
            requestAndAttestKey(state: state, appId: appId, clientDataHash: clientDataHash, completion: completion)
        case .awaitingServerRegistration:
            guard let challengeId = state.challengeId,
                  let attestationObject = state.attestationObject,
                  isChallengeFresh(state) else {
                AppAttestKeyStore.clear(for: appId)
                completion(nil)
                return
            }
            submitAppAttestRegistration(
                state: state,
                appId: appId,
                challengeId: challengeId,
                attestationObject: attestationObject,
                clientDataHash: clientDataHash,
                completion: completion
            )
        }
    }

    private static func requestAndAttestKey(
        state: AppAttestKeyState,
        appId: String,
        clientDataHash: Data,
        completion: @escaping ([String: String]?) -> Void
    ) {
        if let challengeId = state.challengeId,
           let challenge = state.challenge,
           isChallengeFresh(state) {
            attestKey(
                state: state,
                appId: appId,
                challengeId: challengeId,
                challenge: challenge,
                clientDataHash: clientDataHash,
                completion: completion
            )
            return
        }

        requestAppAttestChallenge(appId: appId) { challenge in
            guard let challenge = challenge else {
                completion(nil)
                return
            }
            let pendingState = AppAttestKeyState(
                keyId: state.keyId,
                phase: .awaitingAttestation,
                challengeId: challenge.challengeId,
                challenge: challenge.challenge,
                attestationObject: nil,
                challengeIssuedAt: Date().timeIntervalSince1970
            )
            guard AppAttestKeyStore.save(pendingState, for: appId) else {
                completion(nil)
                return
            }
            attestKey(
                state: pendingState,
                appId: appId,
                challengeId: challenge.challengeId,
                challenge: challenge.challenge,
                clientDataHash: clientDataHash,
                completion: completion
            )
        }
    }

    private static func attestKey(
        state: AppAttestKeyState,
        appId: String,
        challengeId: String,
        challenge: String,
        clientDataHash: Data,
        completion: @escaping ([String: String]?) -> Void
    ) {
        guard let challengeData = decodeBase64URL(challenge) else {
            AppAttestKeyStore.clear(for: appId)
            completion(nil)
            return
        }
        let registrationHash = Data(SHA256.hash(data: challengeData))
        DCAppAttestService.shared.attestKey(state.keyId, clientDataHash: registrationHash) { attestationObject, error in
            guard let attestationObject = attestationObject, error == nil else {
                if !isRetryableAppAttestError(error) {
                    AppAttestKeyStore.clear(for: appId)
                }
                completion(nil)
                return
            }

            let pendingState = AppAttestKeyState(
                keyId: state.keyId,
                phase: .awaitingServerRegistration,
                challengeId: challengeId,
                challenge: nil,
                attestationObject: attestationObject.base64EncodedString(),
                challengeIssuedAt: state.challengeIssuedAt
            )
            guard AppAttestKeyStore.save(pendingState, for: appId) else {
                completion(nil)
                return
            }
            submitAppAttestRegistration(
                state: pendingState,
                appId: appId,
                challengeId: challengeId,
                attestationObject: attestationObject.base64EncodedString(),
                clientDataHash: clientDataHash,
                completion: completion
            )
        }
    }

    private static func submitAppAttestRegistration(
        state: AppAttestKeyState,
        appId: String,
        challengeId: String,
        attestationObject: String,
        clientDataHash: Data,
        completion: @escaping ([String: String]?) -> Void
    ) {
        registerAppAttestKey(
            appId: appId,
            keyId: state.keyId,
            challengeId: challengeId,
            attestationObject: attestationObject
        ) { status in
            switch status {
            case .some(200), .some(409):
                // A 409 after a network retry can mean the server already registered this key.
                let registeredState = AppAttestKeyState(
                    keyId: state.keyId,
                    phase: .registered,
                    challengeId: nil,
                    challenge: nil,
                    attestationObject: nil,
                    challengeIssuedAt: nil
                )
                guard AppAttestKeyStore.save(registeredState, for: appId) else {
                    completion(nil)
                    return
                }
                generateAssertion(keyId: state.keyId, appId: appId, clientDataHash: clientDataHash, completion: completion)
            case .none, .some(408), .some(429), .some(500...599):
                // Keep the generated key and attestation object so a transient failure retries it.
                completion(nil)
            default:
                // Apple requires a key whose server-side attestation failed to be discarded.
                AppAttestKeyStore.clear(for: appId)
                completion(nil)
            }
        }
    }

    private static func generateAssertion(
        keyId: String,
        appId: String,
        clientDataHash: Data,
        completion: @escaping ([String: String]?) -> Void
    ) {
        DCAppAttestService.shared.generateAssertion(keyId, clientDataHash: clientDataHash) { assertion, error in
            guard let assertion = assertion, error == nil else {
                if isInvalidAppAttestKeyError(error) {
                    AppAttestKeyStore.clear(for: appId)
                }
                completion(nil)
                return
            }
            completion([
                "appAttestKeyId": keyId,
                "appAttestAssertion": assertion.base64EncodedString(),
            ])
        }
    }

    private static func isChallengeFresh(_ state: AppAttestKeyState) -> Bool {
        guard let issuedAt = state.challengeIssuedAt else { return false }
        let age = Date().timeIntervalSince1970 - issuedAt
        return age >= 0 && age < appAttestChallengeLifetime
    }

    private static func isRetryableAppAttestError(_ error: Error?) -> Bool {
        isAppAttestError(error, code: .serverUnavailable)
    }

    private static func isInvalidAppAttestKeyError(_ error: Error?) -> Bool {
        isAppAttestError(error, code: .invalidKey)
    }

    private static func isAppAttestError(_ error: Error?, code: DCError.Code) -> Bool {
        guard let error = error else { return false }
        let nsError = error as NSError
        return nsError.domain == DCError.errorDomain && nsError.code == code.rawValue
    }

    private static func shouldDiscardAppAttestKey(responseData: Data?, status: Int?) -> Bool {
        guard status == 403,
              let responseData = responseData,
              let response = try? JSONDecoder().decode(AppAttestResponseError.self, from: responseData) else {
            return false
        }
        if response.reason == "out_of_order_assertion" {
            // An out-of-order network arrival is not a corrupted key. The next assertion
            // generated by the Secure Enclave will have a higher monotonic counter.
            return false
        }
        return response.error == "Native app integrity verification failed"
    }

    private static func requestAppAttestChallenge(appId: String, completion: @escaping (AppAttestChallenge?) -> Void) {
        postJSON(path: "/api/ads/attestation/apple/challenge", body: ["appId": appId]) { data, status in
            guard status == 200, let data = data else {
                completion(nil)
                return
            }
            completion(try? JSONDecoder().decode(AppAttestChallenge.self, from: data))
        }
    }

    private static func registerAppAttestKey(
        appId: String,
        keyId: String,
        challengeId: String,
        attestationObject: String,
        completion: @escaping (Int?) -> Void
    ) {
        postJSON(path: "/api/ads/attestation/apple/register", body: [
            "appId": appId,
            "keyId": keyId,
            "challengeId": challengeId,
            "attestationObject": attestationObject,
        ]) { _, status in
            completion(status)
        }
    }

    private static func postJSON(
        path: String,
        body: [String: String],
        completion: @escaping (Data?, Int?) -> Void
    ) {
        guard let url = URL(string: "\(AdTogether.shared.baseUrl)\(path)"),
              let bodyData = try? JSONSerialization.data(withJSONObject: body) else {
            completion(nil, nil)
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = bodyData
        URLSession.shared.dataTask(with: request) { data, response, _ in
            completion(data, (response as? HTTPURLResponse)?.statusCode)
        }.resume()
    }

    private static func decodeBase64URL(_ value: String) -> Data? {
        var base64 = value.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        let remainder = base64.count % 4
        if remainder > 0 { base64 += String(repeating: "=", count: 4 - remainder) }
        return Data(base64Encoded: base64)
    }
    #endif
}
