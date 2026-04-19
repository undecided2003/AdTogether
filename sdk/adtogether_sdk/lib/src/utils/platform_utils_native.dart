import 'package:package_info_plus/package_info_plus.dart';
import 'platform_utils.dart';

class PlatformInfoProviderImpl implements PlatformInfoProvider {
  @override
  Future<AdPackageInfo> getPackageInfo() async {
    try {
      final info = await PackageInfo.fromPlatform();
      return AdPackageInfo(
        appName: info.appName,
        packageName: info.packageName,
        version: info.version,
      );
    } catch (_) {
      return const AdPackageInfo.empty();
    }
  }
}
