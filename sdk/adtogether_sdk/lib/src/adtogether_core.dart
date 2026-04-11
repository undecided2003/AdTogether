import 'dart:convert';
import 'package:http/http.dart' as http;
import 'models/ad_model.dart';

class AdTogether {
  static String? _appId;
  static String _baseUrl = 'https://adtogether.relaxsoftwareapps.com';

  /// Initialize the AdTogether SDK
  /// [appId] is your registered application ID.
  /// [baseUrl] can optionally be overridden for testing purposes.
  static Future<void> initialize({
    required String appId,
    String? baseUrl,
  }) async {
    _appId = appId;
    if (baseUrl != null) {
      _baseUrl = baseUrl;
    }
  }

  static String get appId {
    if (_appId == null) {
      throw Exception('AdTogether Error: SDK has not been initialized. Please call AdTogether.initialize() first.');
    }
    return _appId!;
  }

  static String get baseUrl => _baseUrl;

  /// Internal method to track an impression
  static Future<void> trackImpression(String adId, {String? token}) async {
    try {
      await http.post(
        Uri.parse('$_baseUrl/api/ads/impression'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'adId': adId,
          if (token != null) 'token': token,
        }),
      );
    } catch (e) {
      print('AdTogether Error: Failed to track impression - $e');
    }
  }

  /// Internal method to track a click
  static Future<void> trackClick(String adId, {String? token}) async {
    try {
      await http.post(
        Uri.parse('$_baseUrl/api/ads/click'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'adId': adId,
          if (token != null) 'token': token,
        }),
      );
    } catch (e) {
      print('AdTogether Error: Failed to track click - $e');
    }
  }

  /// Fetch an ad for a specific ad unit.
  /// [adUnitId] is the unique identifier for the ad placement.
  static Future<AdModel> fetchAd(String adUnitId) async {
    // Ensure SDK is initialized
    final _ = appId;

    final response = await http.get(
      Uri.parse('$_baseUrl/api/ads/serve?country=global&adUnitId=$adUnitId'),
    );

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      return AdModel.fromJson(data);
    } else {
      throw Exception('AdTogether Error: Failed to fetch ad. Status code: ${response.statusCode}');
    }
  }
}
