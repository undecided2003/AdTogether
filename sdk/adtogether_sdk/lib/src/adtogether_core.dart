import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'utils/http_client.dart';
import 'utils/platform_utils.dart';
import 'models/ad_model.dart';

/// The main entry point for the AdTogether SDK.
///
/// Use this class to initialize the SDK and fetch ads.
class AdTogether {
  static String? _appId;
  static String _baseUrl = 'https://www.ad-together.org';
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

  /// The registered App ID for this SDK instance.
  ///
  /// Throws an [Exception] if [initialize] has not been called.
  static String get appId {
    if (_appId == null) {
      throw Exception(
        'AdTogether Error: SDK has not been initialized. Please call AdTogether.initialize() first.',
      );
    }
    return _appId!;
  }

  /// The base API URL used for all ad-serving requests.
  static String get baseUrl => _baseUrl;

  static String? _lastAdId;

  /// Internal method to track an impression
  static Future<void> trackImpression(
    String adId, {
    String? token,
    int? visiblePercent,
    int? visibleDurationMs,
  }) async {
    try {
      await AdHttpClient.instance.post(
        Uri.parse('$_baseUrl/api/ads/impression'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'adId': adId,
          'token': token,
          'appId': _appId,
          if (_bundleId != null) 'bundleId': _bundleId,
          if (_appName != null) 'appName': _appName,
          if (_appVersion != null) 'appVersion': _appVersion,
          'platform': _platformName,
          'environment': kReleaseMode ? 'production' : 'development',
          if (visiblePercent != null) 'visiblePercent': visiblePercent,
          if (visibleDurationMs != null) 'visibleDurationMs': visibleDurationMs,
        }),
      );
    } catch (e) {
      debugPrint('AdTogether Error: Failed to track impression - $e');
    }
  }

  /// Internal method to track a click
  static Future<void> trackClick(String adId, {String? token}) async {
    try {
      await AdHttpClient.instance.post(
        Uri.parse('$_baseUrl/api/ads/click'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'adId': adId,
          'token': token,
          'appId': _appId,
          if (_bundleId != null) 'bundleId': _bundleId,
          if (_appName != null) 'appName': _appName,
          if (_appVersion != null) 'appVersion': _appVersion,
          'platform': _platformName,
          'environment': kReleaseMode ? 'production' : 'development',
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

    final queryParameters = <String, String>{
      'adUnitId': adUnitId,
      'appId': currentAppId,
      'allowSelfAds': _allowSelfAds.toString(),
      'platform': _platformName,
    };
    if (adType != null) {
      queryParameters['adType'] = adType;
    }
    if (_lastAdId != null) {
      queryParameters['exclude'] = _lastAdId!;
    }
    if (_bundleId != null) {
      queryParameters['bundleId'] = _bundleId!;
    }

    final response = await AdHttpClient.instance.get(
      _buildServeUri(queryParameters),
    );

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      final ad = AdModel.fromJson(data);
      if (adType != null && ad.adType != adType) {
        throw Exception(
          'AdTogether Error: Received an ad with a different type than requested.',
        );
      }
      _lastAdId = ad.id;
      return ad;
    } else if (response.statusCode == 401 || response.statusCode == 403) {
      debugPrint('AdTogether Error: Invalid App ID. Please check your dashboard.');
      throw Exception('AdTogether Error: Invalid App ID. Status code: ${response.statusCode}');
    } else {
      throw Exception(
        'AdTogether Error: Failed to fetch ad. Status code: ${response.statusCode}',
      );
    }
  }

  static Uri _buildServeUri(Map<String, String> queryParameters) {
    final baseUri = Uri.parse(_baseUrl);
    final basePath = baseUri.path.endsWith('/')
        ? baseUri.path.substring(0, baseUri.path.length - 1)
        : baseUri.path;
    return baseUri.replace(
      path: '$basePath/api/ads/serve',
      queryParameters: queryParameters,
      fragment: '',
    );
  }
}
