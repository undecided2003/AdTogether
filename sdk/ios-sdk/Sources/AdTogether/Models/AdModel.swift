import Foundation

public struct AdModel: Codable, Identifiable {
    public let id: String
    public let title: String
    public let description: String
    public let clickUrl: String?
    public let imageUrl: String?
    public let token: String?
    public let adType: String?
    public let nativeAttestation: String?

    enum CodingKeys: String, CodingKey {
        case id, title, description, clickUrl, imageUrl, token, adType
        case nativeAttestation
    }
}
