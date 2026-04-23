import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'utils/platform_utils.dart';
import 'models/ad_model.dart';

/// The main entry point for the AdTogether SDK.
///
/// Use this class to initialize the SDK and fetch ads.
class AdTogether {
  static String? _appId;
  static String _baseUrl = 'https://adtogether.relaxsoftwareapps.com';
  static String? _bundleId;
  static String? _appName;
  static String? _appVersion;
  static bool _allowSelfAds = true;

  /// Initializes the AdTogether SDK.
  ///
  /// This must be called before using any AdTogether widgets.
  /// [appId] is your registered App ID from the AdTogether Dashboard.
  /// Optional [baseUrl] overrides the default API endpoint.
  /// Optional [bundleId] specifies your app's package name/bundle ID.
  /// [allowSelfAds] controls if your own app's ads can be shown within this app.
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
    // Use the explicitly provided bundleId if present
    if (bundleId != null) {
      _bundleId = bundleId;
    }

    // Always detect native package info to populate appName and version
    await _detectPackageInfoAsync();
  }

  /// Try to detect the package info on native platforms.
  static Future<void> _detectPackageInfoAsync() async {
    try {
      final AdPackageInfo packageInfo = await PlatformInfoProvider.instance
          .getPackageInfo();
      _appName = packageInfo.appName;
      _appVersion = packageInfo.version;

      if (_bundleId == null && packageInfo.packageName.isNotEmpty) {
        _bundleId = packageInfo.packageName;
      }
    } catch (_) {}
  }

  static String get _platformName {
    if (kIsWeb) return 'web';
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'android';
      case TargetPlatform.iOS:
        return 'ios';
      case TargetPlatform.macOS:
        return 'macos';
      case TargetPlatform.windows:
        return 'windows';
      case TargetPlatform.linux:
        return 'linux';
      case TargetPlatform.fuchsia:
        return 'fuchsia';
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

  /// Detect the user's country code from the device locale.
  /// Returns an ISO 3166-1 alpha-2 code like "US", "DE", "JP", or null.
  /// Uses PlatformDispatcher which requires no permissions.
  static String? get _countryCode {
    try {
      final locale = PlatformDispatcher.instance.locale;
      final country = locale.countryCode;
      if (country != null && country.length == 2) {
        return country.toUpperCase();
      }
    } catch (_) {}
    return null;
  }

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
          if (_appName != null) 'appName': _appName,
          if (_appVersion != null) 'appVersion': _appVersion,
          'platform': _platformName,
          'environment': kReleaseMode ? 'production' : 'development',
          if (_countryCode != null) 'country': _countryCode,
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
          if (_appName != null) 'appName': _appName,
          if (_appVersion != null) 'appVersion': _appVersion,
          'platform': _platformName,
          'environment': kReleaseMode ? 'production' : 'development',
          if (_countryCode != null) 'country': _countryCode,
        }),
      );
    } catch (e) {
      debugPrint('AdTogether Error: Failed to track click - $e');
    }
  }

  /// Fetch an ad for a specific ad unit.
  /// [adUnitId] is the unique identifier for the ad placement.
  /// [adType] optionally filter by 'banner' or 'interstitial'.
  static Future<AdModel> fetchAd({String adUnitId = 'default', String? adType}) async {
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
