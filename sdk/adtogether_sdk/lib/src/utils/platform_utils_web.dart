import 'platform_utils.dart';

// We avoid importing package_info_plus here because its main entry point
// unconditionally exports a Linux implementation that imports dart:io,
// which breaks WASM compatibility for the entire package.

class PlatformInfoProviderImpl implements PlatformInfoProvider {
  @override
  Future<AdPackageInfo> getPackageInfo() async {
    // On Web/WASM, we return empty information to maintain compatibility
    // until package_info_plus fixes its export chain.
    return const AdPackageInfo.empty();
  }
}
