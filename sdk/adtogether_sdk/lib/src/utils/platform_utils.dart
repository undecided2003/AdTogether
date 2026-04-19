import 'platform_utils_native.dart'
    if (dart.library.js_interop) 'platform_utils_web.dart' as impl;

/// A representation of package information.
class AdPackageInfo {
  final String appName;
  final String packageName;
  final String version;

  AdPackageInfo({
    required this.appName,
    required this.packageName,
    required this.version,
  });

  const AdPackageInfo.empty()
      : appName = '',
        packageName = '',
        version = '';
}

/// Abstract base class for platform-specific information providers.
abstract class PlatformInfoProvider {
  Future<AdPackageInfo> getPackageInfo();

  static PlatformInfoProvider get instance => impl.PlatformInfoProviderImpl();
}
