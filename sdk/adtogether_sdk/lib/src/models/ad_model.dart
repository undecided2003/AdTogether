/// A model representing an ad returned by the AdTogether network.
class AdModel {
  /// The unique identifier of the ad.
  final String id;

  /// The title of the ad.
  final String title;

  /// A short description or body text of the ad.
  final String description;

  /// The URL the user should be directed to when they click the ad.
  final String? clickUrl;

  /// An optional URL for the creative image of the ad.
  final String? imageUrl;

  /// An HMAC token used to verify impression and click tracking.
  final String? token;

  /// The type of the ad, typically 'banner' or 'interstitial'.
  final String? adType;

  /// Creates a new [AdModel] instance.
  AdModel({
    required this.id,
    required this.title,
    required this.description,
    this.clickUrl,
    this.imageUrl,
    this.token,
    this.adType,
  });

  /// Creates an [AdModel] from a JSON map.
  factory AdModel.fromJson(Map<String, dynamic> json) {
    return AdModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      clickUrl: json['clickUrl'] as String?,
      imageUrl: json['imageUrl'] as String?,
      token: json['token'] as String?,
      adType: json['adType'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'clickUrl': clickUrl,
      'imageUrl': imageUrl,
      'token': token,
      'adType': adType,
    };
  }
}
