# Run against a local static export with QA_EXPORT and QA_CHROMIUM.
import os, re
from pathlib import Path
from playwright.sync_api import sync_playwright
import threading, functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
class Export(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        base=Path(super().translate_path(path))
        candidate=Path(str(base)+'.html')
        return str(candidate) if candidate.is_file() and not base.is_file() else str(base)
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Export,directory=os.environ['QA_EXPORT']))
threading.Thread(target=server.serve_forever,daemon=True).start()
origin='http://127.0.0.1:'+str(server.server_port)

import time

import subprocess
with sync_playwright() as w:
 br=w.chromium.launch(executable_path=os.environ['QA_CHROMIUM'],args=['--no-sandbox'])
 c=br.new_context()
 js=subprocess.check_output(['node','-e',"""const ts=require('typescript'),fs=require('fs');process.stdout.write(ts.transpileModule(fs.readFileSync('features/adaptiveIsland/layoutJournal.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText)"""],text=True)
 a,b=c.new_page(),c.new_page()
 for p in [a,b]:
  p.route('**/*',lambda r:r.fulfill(status=200,content_type='text/html',body='') if r.request.url==origin+'/' else r.abort());p.goto(origin+'/')
  p.evaluate('src=>{const mod={};new Function("exports",src)(mod);window.layout=mod;}',js)
  p.evaluate('async()=>window.store=await layout.openLayoutJournal()')
 a.evaluate("""async()=>{const it={provider:'builder',id:'test',x:0,z:0,movable:true,scale:2,angle:.2,parts:[],surface:'grass'};await store.swap('synthetic-A',-1,{revision:0,items:[it],prior:null});await store.swap('synthetic-B',-1,{revision:0,items:[],prior:null})}""")
 b.evaluate("""()=>{window.compete=()=>layout.applyMoves(store,'synthetic-A',0,[{provider:'builder',id:'test',from:[0,0],to:[3,4]}],()=>true)}""")
 a.evaluate("""()=>{window.compete=()=>layout.applyMoves(store,'synthetic-A',0,[{provider:'builder',id:'test',from:[0,0],to:[4,5]}],()=>true)}""")
 b.evaluate('()=>{window.attempt=compete()}');a.evaluate('()=>{window.attempt=compete()}')
 assert sorted([a.evaluate('()=>attempt'),b.evaluate('()=>attempt')])==[False,True]
 assert a.evaluate("async()=>(await store.read('synthetic-B')).items.length")==0
 a.evaluate("()=>store.close()");a.evaluate("async()=>window.store=await layout.openLayoutJournal()")
 assert a.evaluate("async()=>(await store.read('synthetic-A')).prior[0].x")==0
 assert not b.evaluate("async()=>layout.restore(store,'synthetic-A',0,()=>true)")
 assert b.evaluate("async()=>layout.restore(store,'synthetic-A',1,()=>true)")
 res=a.evaluate("""async()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){let r=put.apply(this,args);this.transaction.abort();return r};try{await store.swap('synthetic-A',2,{revision:3,prior:null,items:[]});return false}catch{return true}finally{IDBObjectStore.prototype.put=put}}""")
 assert res;assert a.evaluate("async()=>(await store.read('synthetic-A')).revision")==2
 print('PASS real IndexedDB, two tabs, one winning revision, independent identities, reopen, stale restore, successful undo and abort after put.')
 br.close()
