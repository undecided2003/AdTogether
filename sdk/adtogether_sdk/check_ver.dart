import 'dart:io';
import 'dart:convert';
void main() async {
  var req = await HttpClient().getUrl(Uri.parse('https://pub.dev/api/packages/package_info_plus'));
  var res = await req.close();
  var str = await res.transform(utf8.decoder).join();
  print('Latest package_info_plus: ' + jsonDecode(str)['latest']['version']);
}
