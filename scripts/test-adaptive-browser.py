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
with sync_playwright() as w:
 for phone in (False,True):
  br=w.chromium.launch(executable_path=os.environ.get('QA_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox','--renderer-process-limit=1','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
  ctx=br.new_context(viewport={'width':390 if phone else 1280,'height':844},has_touch=phone,is_mobile=phone,service_workers='block')
  ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin+'/') and r.request.method in ('GET','HEAD') else r.abort())
  # Keep the one-time welcome screens from opening midway through a district gesture.
  ctx.add_init_script("""
   localStorage.setItem('@nova/islandGuide.v2:guest', 'seen');
   localStorage.setItem('@nova/dailyGreeting.v1:guest', new Date().toLocaleDateString('sv-SE'));
  """)
  ctx.add_init_script("""window.draws=0;for(const k of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){const m=WebGL2RenderingContext.prototype[k];WebGL2RenderingContext.prototype[k]=function(...a){window.draws++;return m.apply(this,a)}}""")
  p=ctx.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.set_default_timeout(12500)
  def btn(name): return p.get_by_role('button',name=name,exact=True)
  def click(loc):
   daily=btn('Maybe Later')
   if daily.count() and daily.first.is_visible(): daily.first.press('Enter')
   loc.tap() if phone else loc.click()
  p.goto(origin+'/discover')
  click(btn('Visit my Island interest garden'))
  click(btn('Enable personalization'))
  for name in ('Music','Painting & art','Astronomy'): click(btn(name))
  p.wait_for_function('window.draws>0')
  assert btn('Science').is_disabled()
  click(btn('Adapt to my voluntary discoveries'))
  mark=p.get_by_role('button',name=re.compile('I explored this for myself'))
  click(mark);p.get_by_text('Recorded for your garden.',exact=True).wait_for()
  p.reload()
  p.get_by_text('Garden spaces:',exact=False).first.wait_for()
  p.wait_for_function('window.draws>0')
  click(btn('Use my choices only'))
  p.get_by_text('Garden spaces: Music, Painting & art, Astronomy',exact=True).wait_for()
  time.sleep(1)
  before=p.evaluate('window.draws');time.sleep(.7);after=p.evaluate('window.draws')
  print('phone' if phone else 'desktop','WebGL draws',before,after,'idle delta',after-before,'errors',errors,flush=True)
  assert before>0 and after-before==0 and not errors
  click(btn('Disable personalization'));p.locator('canvas').wait_for(state='detached')
  click(btn('Reset garden preferences'));p.get_by_text('Preferences and voluntary counts cleared.',exact=True).wait_for()
  p.reload();btn('Enable personalization').wait_for();assert not p.locator('canvas').count()
  print('PASS guest Discover entry, three selections, voluntary opt-in, persistence, disable and reset',flush=True)
  br.close()
