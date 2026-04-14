class AdModel {
  final String id;
  final String title;
  final String description;
  final String? clickUrl;
  final String? imageUrl;
  final String? token;
  final String? adType;

  AdModel({
    required this.id,
    required this.title,
    required this.description,
    this.clickUrl,
    this.imageUrl,
    this.token,
    this.adType,
  });

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

