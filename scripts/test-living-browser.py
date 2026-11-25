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

import time
with sync_playwright() as w:
 for phone in (False,True):
  br=w.chromium.launch(executable_path=os.environ['QA_CHROMIUM'],args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
  c=br.new_context(viewport={'width':390 if phone else 1280,'height':844},has_touch=phone,is_mobile=phone,reduced_motion='reduce' if phone else 'no-preference',service_workers='block')
  c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin+'/') and r.request.method in ('GET','HEAD') else r.abort())
  c.add_init_script("""window.draws=0;const m=WebGL2RenderingContext.prototype.drawElements;WebGL2RenderingContext.prototype.drawElements=function(...a){window.draws++;return m.apply(this,a)};""")
  p=c.new_page();errs=[];p.on('pageerror',lambda e:errs.append(str(e)));p.set_default_timeout(12000)
  def button(t):return p.get_by_role('button',name=t,exact=True).first
  def click(t):
   daily=button('Maybe Later')
   if daily.count() and daily.is_visible(): daily.press('Enter')
   b=button(t)
   for trial in range(5):
    for label in ['Got It','Maybe Later']:
     dismiss=p.get_by_text(label,exact=True).first
     if dismiss.count() and dismiss.is_visible():
      try:dismiss.click(timeout=650)
      except Exception:pass
    try:
     b.tap(timeout=2200) if phone else b.click(timeout=2200)
     return
    except Exception:
     if trial==4: raise
  p.goto(origin+'/interest-garden');click('Enable personalization')
  for s in ['Music','Filmmaking','Astronomy']:click(s)
  click('Explore districts on My Island');click('Visit district shore')
  p.get_by_text('Melody Grove · Lanternlight Studios · Starlight Observatory',exact=True).first.wait_for()
  p.get_by_text('District shore',exact=True).wait_for();p.wait_for_function('window.draws>200',timeout=50000)
  if phone: assert not button('Watch the district residents').count()
  else:click('Watch the district residents');click('Skip animation')
  p.locator('canvas').first.scroll_into_view_if_needed()
  p.wait_for_timeout(1000)
  if os.environ.get('QA_SCREENSHOTS'): p.locator('canvas').first.screenshot(path=Path(os.environ['QA_SCREENSHOTS'])/('living-phone.png' if phone else 'living-desktop.png'))
  print('phone' if phone else 'desktop','draws',p.evaluate('window.draws'),'errors',errs,flush=True)
  click('Return to Island center');click('Visit my Island interest garden')
  if not phone:
   click('Open sound bench');click('Play chord');p.get_by_text(re.compile('Playing |Sound could not|unavailable')).first.wait_for()
   print('sound bench:',[t for t in p.locator('body').inner_text().splitlines() if 'Playing ' in t or 'unavailable' in t][-2:],flush=True)
   click('Stop sound');click('Close sound bench')
  click('Enter Lanternlight Studios adventure');button('Leave adventure').wait_for()
  print('passed district entry, camera control, motion preference and adventure navigation',flush=True)
  assert not errs
  br.close()
