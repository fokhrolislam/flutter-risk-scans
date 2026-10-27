# flutter-risk-scans

Four tiny static scanners for Flutter apps that talk to a PHP or MySQL backend. Each one catches a class of bug that passes `flutter analyze`, passes the test suite, and crashes only on a real phone against real data.

They are deliberately simple (regex and the Dart analyzer, no plugins) so they can run in any CI in a second.

| Scanner | Catches |
|---|---|
| `tool/risk-scan-casts.js` | `as Map` / `as List` on API data without an `is` guard nearby. Production MySQL often stores numbers as `varchar`, JSON shapes vary per tenant, and a raw cast throws `type 'String' is not a subtype` only on the phone. |
| `tool/risk-scan.js` | Three things at once: `Dropdown*` widgets without `isExpanded: true` (text overflow on narrow screens), raw `as Map/List` casts, and `int.parse` / `double.parse` where `tryParse` belongs. |
| `tool/guard-scan.js` | Screens that declare a busy flag (`_saving`, `_submitting`, `_paying`, …) but never use it to block a second tap. Double submits create duplicate payments. |
| `tool/avscan.dart` | Every `.value` read on a Riverpod `AsyncValue` (type-resolved with the Dart analyzer). `AsyncValue.value` throws when the state is `AsyncError` without a previous value; `valueOrNull` does not. `--apply` rewrites them. |

## Usage

```bash
# JavaScript scanners: run from the app root, optional path argument
node tool/risk-scan-casts.js lib/features
node tool/risk-scan.js lib/features
node tool/guard-scan.js

# AsyncValue scanner: needs the analyzer package
cd tool && dart pub get
dart run avscan.dart /path/to/your/flutter/app          # report, expects "TOTAL 0"
dart run avscan.dart /path/to/your/flutter/app --apply  # rewrite .value -> .valueOrNull
```

Wire the four into CI and fail on any hit. In the Sabaq app these run after every change next to `flutter analyze`; the rule "raw casts are banned, use safe parsing" is enforced by `risk-scan-casts.js` rather than by code review.

Output labels are in Bangla in the first three scripts because that is the team's working language; the logic is language-neutral.

## License

MIT
