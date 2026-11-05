// Typecheck the production collector entry points and all their imports.
// The repo's broad tsconfig also includes historical backups outside this scope.
'use strict';
const ts = require('typescript');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const entryPoints = [
  'app/_lib/collectorClient.ts',
  'app/_lib/islandAutoPlacement.ts',
  'app/_lib/islandDecorationCatalog.ts',
  'app/collector/index.tsx',
  'app/context/IslandBuilderContext.tsx',
  'app/context/IslandDecorationContext.tsx',
  'app/components/island3d/NorasLastLantern.tsx',
  'app/components/island3d/IslandDecorationLayer.tsx',
  'app/components/island3d/IslandDecorationShopPanel.tsx',
  'app/components/island3d/IslandBuilderPanel.tsx',
];
const source = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
if (source.error) throw Error(ts.flattenDiagnosticMessageText(source.error.messageText, '\n'));
const config = ts.parseJsonConfigFileContent({...source.config, include: entryPoints}, ts.sys, root);
const program = ts.createProgram(config.fileNames, {...config.options, noEmit: true});
const diagnostics = [...config.errors, ...ts.getPreEmitDiagnostics(program)];
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: file => file, getCurrentDirectory: () => root, getNewLine: () => '\n',
  }));
  process.exitCode = 1;
} else {
  console.log('PASS: production collector entry points and imported dependencies typecheck');
}
