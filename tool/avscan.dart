// Finds `.value` reads on Riverpod AsyncValue (throws on AsyncError without a previous value).
import 'dart:io';
import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/dart/element/type.dart';

Future<void> main(List<String> args) async {
  final root = Directory(args[0]).absolute.path;
  final lib = '$root${Platform.pathSeparator}lib';
  final coll = AnalysisContextCollection(includedPaths: [lib]);
  var hits = 0;
  for (final ctx in coll.contexts) {
    for (final path in ctx.contextRoot.analyzedFiles()) {
      if (!path.endsWith('.dart')) continue;
      final r = await ctx.currentSession.getResolvedUnit(path);
      if (r is! ResolvedUnitResult) continue;
      final v = _V(r, root);
      r.unit.accept(v);
      hits += v.n;
      if (args.length > 1 && args[1] == "--apply" && v.edits.isNotEmpty) {
        var src = File(path).readAsStringSync();
        final offs = v.edits.toSet().toList()..sort((a, b) => b.compareTo(a));
        for (final o in offs) {
          if (src.substring(o, o + 5) != "value") throw StateError("offset mismatch $path $o");
          src = src.replaceRange(o, o + 5, "valueOrNull");
        }
        File(path).writeAsStringSync(src);
      }
    }
  }
  stdout.writeln('TOTAL $hits');
}

bool _isAsyncValue(DartType? t) {
  if (t is! InterfaceType) return false;
  if (t.element.name == 'AsyncData') return false; // value always present
  for (final s in [t, ...t.allSupertypes]) {
    if (s.element.name == 'AsyncValue') return true;
  }
  return false;
}

class _V extends RecursiveAstVisitor<void> {
  _V(this.r, this.root);
  final ResolvedUnitResult r;
  final String root;
  int n = 0;
  final edits = <int>[];
  void _hit(AstNode node, Expression target, int nameOffset) {
    if (!_isAsyncValue(target.staticType)) return;
    edits.add(nameOffset);
    n++;
    final line = r.lineInfo.getLocation(node.offset).lineNumber;
    stdout.writeln('${r.path.substring(root.length + 1)}:$line  ${node.toSource()}');
  }
  @override
  void visitPropertyAccess(PropertyAccess node) {
    if (node.propertyName.name == 'value' && node.realTarget is Expression) _hit(node, node.realTarget, node.propertyName.offset);
    super.visitPropertyAccess(node);
  }
  @override
  void visitPrefixedIdentifier(PrefixedIdentifier node) {
    if (node.identifier.name == 'value') _hit(node, node.prefix, node.identifier.offset);
    super.visitPrefixedIdentifier(node);
  }
}
