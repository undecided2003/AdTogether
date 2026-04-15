import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'models/ad_model.dart';

class AdTogether {
  static String? _appId;
  static String _baseUrl = 'https://adtogether.relaxsoftwareapps.com';
  static String? _bundleId;
  static bool _allowSelfAds = true;

  static Future<void> initialize({
    required String appId,
    String? baseUrl,
    String? bundleId,
    bool allowSelfAds = true,
  }) async {
    _appId = appId;
    if (baseUrl != null) {
      _baseUrl = baseUrl;
    }
    _allowSelfAds = allowSelfAds;
    // Use the explicitly provided bundleId, or try to auto-detect
    if (bundleId != null) {
      _bundleId = bundleId;
    } else {
      _bundleId = _detectBundleId();
    }
  }

  /// Try to detect the bundle / package identifier on native platforms.
  /// Returns null on web (Origin header handles tracking automatically).
  static String? _detectBundleId() {
    try {
      // On native (iOS/Android), the package name is resolved from the
      // platform's isolate name. For a more reliable bundle ID you can
      // pass it explicitly via initialize(bundleId: ...).
      return null; // Will rely on Origin header for web, explicit param for mobile
    } catch (_) {
      return null;
    }
  }

  static String get appId {
    if (_appId == null) {
      throw Exception(
        'AdTogether Error: SDK has not been initialized. Please call AdTogether.initialize() first.',
      );
    }
    return _appId!;
  }

  static String get baseUrl => _baseUrl;

  static String? _lastAdId;

  /// Internal method to track an impression
  static Future<void> trackImpression(String adId, {String? token}) async {
    try {
      await http.post(
        Uri.parse('$_baseUrl/api/ads/impression'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'adId': adId,
          'token': token,
          'apiKey': _appId,
          if (_bundleId != null) 'bundleId': _bundleId,
        }),
      );
    } catch (e) {
      debugPrint('AdTogether Error: Failed to track impression - $e');
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
          'token': token,
          'apiKey': _appId,
          if (_bundleId != null) 'bundleId': _bundleId,
        }),
      );
    } catch (e) {
      debugPrint('AdTogether Error: Failed to track click - $e');
    }
  }

  /// Fetch an ad for a specific ad unit.
  /// [adUnitId] is the unique identifier for the ad placement.
  /// [adType] optionally filter by 'banner' or 'interstitial'.
  static Future<AdModel> fetchAd(String adUnitId, {String? adType}) async {
    // Ensure SDK is initialized
    final currentAppId = appId;

    String url =
        '$_baseUrl/api/ads/serve?country=global&adUnitId=$adUnitId&apiKey=$currentAppId';
    if (adType != null) {
      url += '&adType=$adType';
    }
    if (_lastAdId != null) {
      url += '&exclude=$_lastAdId';
    }
    if (_bundleId != null) {
      url += '&bundleId=$_bundleId';
    }
    url += '&allowSelfAds=$_allowSelfAds';

    final response = await http.get(Uri.parse(url));

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      final ad = AdModel.fromJson(data);
      _lastAdId = ad.id;
      return ad;
    } else {
      throw Exception(
        'AdTogether Error: Failed to fetch ad. Status code: ${response.statusCode}',
      );
    }
  }
}
