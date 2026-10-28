(function(){
var PROJECT="shalaby-group",KEY="REPLACE_WITH_FIREBASE_API_KEY",DB="(default)";
var BASE="https://firestore.googleapis.com/v1/projects/"+PROJECT+"/databases/"+encodeURIComponent(DB)+"/documents/reviewRequests/";
var app=document.getElementById("app");
var token=(new URLSearchParams(location.search).get("t")||"").trim();
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function show(emoji,title,text){app.innerHTML='<div class="card msg"><div class="big">'+emoji+'</div><h1>'+esc(title)+'</h1><p>'+esc(text)+'</p></div>'}
function val(f){if(!f)return undefined;if("stringValue"in f)return f.stringValue;if("integerValue"in f)return Number(f.integerValue);if("booleanValue"in f)return f.booleanValue;return undefined}
if(!/^[a-z0-9]{20,40}$/.test(token)){show("🔗","اللينك مش صحيح","اطلب من الموظف يبعتلك اللينك تاني.");return}
fetch(BASE+token+"?key="+KEY).then(function(r){
  if(r.status===404||r.status===403){show("🔗","اللينك مش موجود","اطلب من الموظف يبعتلك اللينك تاني.");return null}
  if(!r.ok){show("⚠️","حصلت مشكلة","جرّب تفتح اللينك تاني بعد شوية.");return null}
  return r.json();
}).then(function(doc){
  if(!doc)return;
  var f=doc.fields||{},status=val(f.status);
  var full=String(val(f.leadName)||"").trim(),tm=full.match(/^(م\.|د\.|أ\.|الحاج|الحاجة|السيد|السيدة|المستشار|الكابتن|المهندس|المهندسة|الدكتور|الدكتورة|الأستاذ|الأستاذة)\s*/),
  name=(tm?tm[1]+" ":"")+full.slice(tm?tm[0].length:0).split(/\s+/)[0];
  if(status==="answered"){show("💚","شكرًا ليك","تقييمك وصلنا بالفعل، ورأيك فارق معانا.");return}
  if(status==="cancelled"){show("✅","الطلب ده اتقفل","شكرًا لوقتك.");return}
  render(name,String(val(f.subjectLabel)||""),String(val(f.branchName)||""));
}).catch(function(){show("⚠️","مفيش اتصال","اتأكد من الإنترنت وجرّب تاني.")});

function stars(id,small){var h='<div class="stars'+(small?' small':'')+'" data-id="'+id+'">';for(var i=1;i<=5;i++)h+='<button type="button" data-v="'+i+'" aria-label="'+i+' من 5">★</button>';return h+'</div>'}
function render(name,label,branch){
  app.innerHTML='<div class="card"><h1>أهلًا '+esc(name)+' 👋</h1><p>'+esc(label||("زيارتك"+(branch?" لفرع "+branch:"")))+'</p><p>رأيك بيساعدنا نبقى أحسن. الأمر بياخد دقيقة.</p>'
  +'<div class="q"><span>تقييمك العام *</span>'+stars("rating")+'</div>'
  +'<div class="q"><span>تفاصيل أكتر (اختياري)</span>'
  +'<div class="row"><span>معاملة الفريق</span>'+stars("treatment",1)+'</div>'
  +'<div class="row"><span>السعر</span>'+stars("price",1)+'</div>'
  +'<div class="row"><span>الجودة والشغل</span>'+stars("quality",1)+'</div></div>'
  +'<div class="q"><span>هترشحنا لأصحابك وأهلك؟</span><div class="yn" id="rec"><button type="button" data-v="1">أكيد</button><button type="button" data-v="0">مش متأكد</button></div></div>'
  +'<div class="q" id="refbox" hidden><span>حد من أصحابك أو أهلك محتاج دهانات أو تشطيب؟</span><p class="hint">سيب لنا اسمه ورقمه (اختياري) وهنكلمه بلطف ونقوله إنك رشّحتنا.</p>'
  +'<input id="rn" maxlength="80" placeholder="اسمه" autocomplete="off"><input id="rp" type="tel" dir="ltr" maxlength="20" inputmode="tel" placeholder="01xxxxxxxxx" autocomplete="off"></div>'
  +'<div class="q"><label for="c">عندك ملاحظة أو شكوى؟ اكتبها لنا</label><textarea id="c" maxlength="1500" placeholder="اكتب هنا بحرية…"></textarea>'
  +'<label class="chk"><input type="checkbox" id="cmp"><span>دي شكوى وعايز حد من الإدارة يتواصل معايا بخصوصها</span></label></div>'
  +'<div class="err" id="err"></div><button class="send" id="send" type="button">إرسال التقييم</button></div>';
  var v={rating:0,treatment:0,price:0,quality:0,rec:null};
  app.querySelectorAll(".stars").forEach(function(box){
    var id=box.getAttribute("data-id");
    box.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;v[id]=Number(b.getAttribute("data-v"));
      box.querySelectorAll("button").forEach(function(x){x.classList.toggle("on",Number(x.getAttribute("data-v"))<=v[id])});
      if(id==="rating"&&v.rating<=2)document.getElementById("cmp").checked=true;if(id==="rating")refToggle()});
  });
  function refToggle(){var box=document.getElementById("refbox"),show=v.rating>=4;box.hidden=!show;if(!show){document.getElementById("rn").value="";document.getElementById("rp").value=""}}
  document.getElementById("rec").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;v.rec=b.getAttribute("data-v")==="1";
    this.querySelectorAll("button").forEach(function(x){x.classList.toggle("on",x===b)})});
  document.getElementById("send").addEventListener("click",function(){
    var err=document.getElementById("err");err.textContent="";
    if(!v.rating){err.textContent="اختار تقييمك العام بالنجوم الأول.";return}
    var comment=document.getElementById("c").value.trim(),complaint=document.getElementById("cmp").checked;
    var resp={rating:{integerValue:String(v.rating)}};
    ["treatment","price","quality"].forEach(function(k){if(v[k])resp[k]={integerValue:String(v[k])}});
    if(v.rec!==null)resp.wouldRecommend={booleanValue:v.rec};
    if(comment)resp.comment={stringValue:comment};
    var rn=document.getElementById("rn").value.trim(),rp=document.getElementById("rp").value.trim(),rd=rp.replace(/\D/g,"");
    if(!document.getElementById("refbox").hidden&&(rn||rp)){
      if(!rn||rd.length<10||rd.length>15){err.textContent="اكتب اسم صديقك ورقم موبايله بشكل صحيح، أو سيب الخانتين فاضيين.";return}
      resp.referral={mapValue:{fields:{name:{stringValue:rn},phone:{stringValue:rp}}}};
    }
    var body={fields:{status:{stringValue:"answered"},answeredAt:{stringValue:new Date().toISOString()},isComplaint:{booleanValue:complaint},response:{mapValue:{fields:resp}}}};
    var url=BASE+token+"?currentDocument.exists=true&key="+KEY+"&updateMask.fieldPaths=status&updateMask.fieldPaths=answeredAt&updateMask.fieldPaths=isComplaint&updateMask.fieldPaths=response";
    var btn=document.getElementById("send");btn.disabled=true;btn.textContent="بنبعت…";
    fetch(url,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(function(r){
      if(r.ok){show(complaint?"🤝":"💚",complaint?"وصلتنا شكواك":"شكرًا على تقييمك",complaint?"هنتواصل معاك في أقرب وقت لحلها. نعتذر عن أي إزعاج.":"رأيك وصلنا وفارق معانا جدًا.")}
      else{btn.disabled=false;btn.textContent="إرسال التقييم";err.textContent=r.status===403?"التقييم ده اتبعت قبل كده أو اتقفل.":"حصلت مشكلة، جرّب تاني."}
    }).catch(function(){btn.disabled=false;btn.textContent="إرسال التقييم";err.textContent="مفيش اتصال بالإنترنت، جرّب تاني."});
  });
}
})();
