# Run against a local static export with QA_EXPORT and QA_CHROMIUM.
import os
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

with sync_playwright() as w:
 for phone in (False,True):
  br=w.chromium.launch(executable_path=os.environ['QA_CHROMIUM'],args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
  c=br.new_context(viewport={'width':390 if phone else 1280,'height':844},has_touch=phone,is_mobile=phone,reduced_motion='reduce' if phone else 'no-preference',service_workers='block')
  c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin+'/') and r.request.method in ('GET','HEAD') else r.abort())
  c.add_init_script("""localStorage.setItem('@nova/islandGuide.v2:guest','seen');localStorage.setItem('@nova/dailyGreeting.v1:guest',new Date().toLocaleDateString('sv-SE'));window.draws=0;const m=WebGL2RenderingContext.prototype.drawElements;WebGL2RenderingContext.prototype.drawElements=function(...a){window.draws++;return m.apply(this,a)};""")
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
     if trial==4:
      print(t,p.locator("body").inner_text()[-2400:],flush=True)
      raise
  p.goto(origin+'/interest-garden');click('Enable personalization')
  for label in ['Technology','Music','Astronomy']:click(label)
  click('Explore districts on My Island');click('Visit district shore')
  click('Look closer at Circuit Commons');click('Turn view');click('Zoom closer')
  p.get_by_text('Circuit Commons',exact=True).first.wait_for()
  def capture(label):
   directory=os.environ.get('QA_SCREENSHOTS')
   if directory:
    dest=Path(directory);dest.mkdir(exist_ok=True, parents=True)
    p.locator('canvas').first.screenshot(path=str(dest / (('phone' if phone else 'desktop')+'-'+label+'.png')))
  capture('focus')
  def sample():
   return p.evaluate('''async()=>{const times=[];await new Promise(done=>{function step(t){times.push(t);if(times.length===25)done();else requestAnimationFrame(step)}requestAnimationFrame(step)});const spans=times.slice(1).map((n,i)=>n-times[i]).sort((a,b)=>a-b);return {median:Math.round(spans[12]),p95:Math.round(spans[22]),heapMiB:Math.round((performance.memory?.usedJSHeapSize||0)/1048576)}}''')
  print('phone' if phone else 'desktop','idle',sample(),flush=True)
  if phone:
   assert not button('Watch the district residents').count()
   canvas=p.locator('canvas').first
   canvas.scroll_into_view_if_needed()
   box=canvas.bounding_box()
   cx=box['x']+box['width']*.42
   cy=box['y']+box['height']*.55
   session=c.new_cdp_session(p)
   for phase,spread,offset in [('touchStart',24,0),('touchMove',28,2),('touchMove',39,10),('touchMove',51,16)]:
    points=[{'x':cx+offset+direction*spread,'y':cy,'id':index} for index,direction in enumerate((-1,1))]
    session.send('Input.dispatchTouchEvent',{'type':phase,'touchPoints':points})
   session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   assert p.url.endswith('/island') and button('Enter Circuit Commons attraction').is_visible()
   print('PASS two-finger gesture retained district focus and did not enter an attraction',flush=True)
  else:
   click('Watch the district residents');print('activity',sample(),flush=True)
  click('Enter Circuit Commons attraction')
  p.get_by_text('Circuit Commons robot workshop',exact=True).wait_for()
  for command in ['Left','Forward','Forward','Forward','Right','Forward','Forward']:click(command)
  for step in range(7):click('Step robot')
  p.get_by_text('Delivered the seedling',exact=False).first.wait_for()
  click('Replay route');click('Undo last command');click('Clear program')
  click('Return to my district view')
  p.get_by_text('Circuit Commons',exact=True).first.wait_for()
  click('Zoom out');click('Return to Island center')
  p.get_by_text('Study Grove',exact=True).first.wait_for()
  capture('center')
  assert not errs,errs
  print('PASS local step-by-step workshop, return to focused district, camera controls, reduced-motion and center navigation',flush=True)
  br.close()
