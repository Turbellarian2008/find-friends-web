(function(){
  const app = document.getElementById('app');

  // 登录校验：未登录则提示并跳转到登录页
  function requireLogin() {
    const u = Api.getUser && Api.getUser();
    if (!u || !u.userId) {
      Api.toast && Api.toast('请先登录');
      setTimeout(()=> { location.hash = '#/login'; }, 300);
      return false;
    }
    return true;
  }
  // 统一的活动列表项渲染函数，确保首页/我创建的/我加入的展示一致
  function renderActivityItem(a){
    const region = [a.province, a.city, a.area].filter(Boolean).join(' ') || (a.area || '');
    const startTime = a.begin_time || a.start_time || a.timeSlot || '';
    const endTime = a.endtime || a.end_time || '';
    const type = a.type || '';
    const joined = (typeof a.joinedPeople !== 'undefined') ? a.joinedPeople : (typeof a.joined_people !== 'undefined' ? a.joined_people : (Array.isArray(a.participants) ? a.participants.length : 0));
    const total = (typeof a.totalPeople !== 'undefined') ? a.totalPeople : (typeof a.total_people !== 'undefined' ? a.total_people : '');
    const id = a.id || a._id || '';
    const isExpired = Number(a.expire) === 1;
    return `
      <li>
        <div class="item-title">${a.name || ''} ${type ? `<span class="badge badge-type">${type}</span>` : ''} ${isExpired ? '<span class="badge badge-expired">已过期</span>' : ''}</div>
        <div class="meta">地点：${region} ${a.location || ''}</div>
        <div class="meta">日期：${a.date || ''}</div>
        <div class="meta">时间：${startTime || ''}${(startTime && endTime)? ' - ' : ''}${endTime || ''}</div>
        <div class="meta">人数：${joined || 0} / ${total || 0}</div>
        <div class="row"><a class="button" href="#/activity?id=${encodeURIComponent(id)}">查看详情</a></div>
      </li>`;
  }

  function getQuery() {
    const hash = (location.hash || '#/').slice(1);
    const [path, qs] = hash.split('?');
    const q = {};
    if (qs) qs.split('&').forEach(p=>{ const [k,v] = p.split('='); q[decodeURIComponent(k)] = decodeURIComponent(v||''); });
    return { path, query: q };
  }

  // iOS 安全密码掩码：在 iOS 上不使用 type="password"，改用 text + CSS 掩码，避免输入框变细/无法输入
  function setupPwdToggle(inputEl, eyeEl) {
    if (!inputEl || !eyeEl) return;
    const isIOS = /iP(hone|od|ad)|iOS/i.test(navigator.userAgent || '') || /Macintosh/.test(navigator.userAgent) && 'ontouchend' in document; // 兼容 iPadOS
    const setIcon = (visible) => {
      // visible=true 表示明文显示
      eyeEl.src = visible ? './icon/password_eye.png' : './icon/password_eyeclose.png';
      eyeEl.alt = visible ? '隐藏密码' : '显示密码';
    };
    // 基础属性，降低自动更正干扰
    inputEl.autocapitalize = 'none';
    inputEl.autocorrect = 'off';
    inputEl.spellcheck = false;

    if (isIOS) {
      // iOS：使用 text + 掩码，保持高度与输入正常
      try { inputEl.type = 'text'; } catch(_){}
      inputEl.classList.add('masked');
      setIcon(false);
      eyeEl.addEventListener('click', () => {
        const masked = inputEl.classList.contains('masked');
        if (masked) { inputEl.classList.remove('masked'); setIcon(true); }
        else { inputEl.classList.add('masked'); setIcon(false); }
      });
    } else {
      // 非 iOS：沿用原生 password 切换
      try { inputEl.type = 'password'; } catch(_){}
      setIcon(false);
      eyeEl.addEventListener('click', () => {
        const hidden = inputEl.type === 'password';
        inputEl.type = hidden ? 'text' : 'password';
        setIcon(hidden);
      });
    }
  }

  // 违禁词检测（DFA，数据源：site/sensitive.json；最终以后端为准）
  // 预加载 DFA（不阻塞 UI，首次使用也会已就绪）
  if (window.Sensitive && typeof window.Sensitive.ensureReady === 'function') {
    window.Sensitive.ensureReady();
  }
  function assertClean(text, fieldName){
  try {
    if (!text) return true;
    if (!window.Sensitive || !window.Sensitive.has) return true; // 若未加载到模块则放行，避免前端误杀；后端仍应复检
    if (window.Sensitive.has(text)) {
      Api.toast(`${fieldName}包含违禁词，请修改`);
      return false;
    }
    
    return true;
  } catch (_) { return true; }
}
  function route() {
    const { path, query } = getQuery();
    switch (path) {
      case '/login': return renderLogin();
      case '/home': return renderHome();
      case '/changePassword': return renderChangePassword();
      case '/activity': return renderActivityDetail(query.id || '');
      case '/create': return renderCreate();
      case '/my': return renderMyActivities();
      case '/joined': return renderJoinedActivities();
      case '/user': return renderUserInfo();
      case '/feedback': return renderFeedback();
      case '/register': return renderRegister();
      default: return renderHome();
    }
  }

  function nav() {
    const u = Api.getUser();
    return `
      <div class="nav">
        <a href="#/home">首页</a>
        <a href="#/create">创建活动</a>
        <a href="#/my">我创建的</a>
        <a href="#/joined">我加入的</a>
        <a href="#/feedback">反馈</a>
        <span style="float:right"><a href="#/user">我的资料</a> ${u && u.username ? `
          <span id="settingsWrap" class="settings-wrap">
            <span id="settingsToggle" class="settings-link">设置</span>
            <div id="settingsMenu" class="dropdown">
              <a href="#/changePassword" id="nav-change-pwd">修改密码</a>
            </div>
          </span>
          <span class="login-text">已登录：${u.username}</span> <a href=\"#/login\" id=\"logout\">退出</a>` : `<a href=\"#/register\" id=\"nav-register\">注册</a> <a href=\"#/login\">登录</a>`}</span>
      </div>
    `;
  }

  function renderLogin() {
    const u = Api.getUser() || {};
    app.innerHTML = nav() + `
      <div class="container">
        <div class="card">
          <div class="title">用户登录</div>
          <div class="row column">
            <label class="field-label" for="username">用户名</label>
            <input id="username" class="input" placeholder="请输入用户名" value="${u.username || ''}" aria-label="用户名" />
          </div>
          <div class="row column">
            <label class="field-label" for="password">密码</label>
            <div class="field-with-icon">
              <input id="password" class="input input-icon-right" type="password" placeholder="请输入密码" aria-label="密码" />
              <img id="pwdEye" src="./icon/password_eyeclose.png" alt="显示密码" class="icon-right" />
            </div>
          </div>
          <div class="row"><button id="loginBtn" class="button">登录</button><button id="toRegister" class="button" style="background:#10b981">注册</button></div>
        </div>
      </div>`;
    bindLogout();
    document.getElementById('toRegister').onclick = () => { location.hash = '#/register'; };
    document.getElementById('loginBtn').onclick = async () => {
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      if (!username) return Api.toast('请输入用户名');
      if (!password) return Api.toast('请输入密码');
      try {
        const res = await Api.post('userLogin', { username, password });
        if (res.code !== 0) throw new Error(res.message || '登录失败');
        const info = {
          token: res.data && res.data.token,
          userId: res.data && res.data.userId,
          username: res.data && res.data.username
        };
        Api.saveUser(info);
        Api.toast('登录成功');
        setTimeout(() => location.hash = '#/home', 800);
      } catch (e) {
        Api.toast(e.message || '登录失败');
      }
    };
    // 密码显示/隐藏（iOS 安全掩码）
    setupPwdToggle(document.getElementById('password'), document.getElementById('pwdEye'));
  }

  async function renderHome() {
    const isDesktop = window.matchMedia && window.matchMedia('(min-width: 768px)').matches;
    app.innerHTML = nav() + `
      <div class="container">
        <div class="card">
          <div class="title">活动列表</div>
          <div class="row column">
            <div class="field-with-icon">
              <img src="./icon/search.png" alt="搜索" class="icon-left" />
              <input id="searchTitle" class="input input-icon-left" placeholder="搜索活动标题" aria-label="搜索活动标题" />
            </div>
          </div>
          <div class="row" style="justify-content: space-between; align-items:center; gap:12px;">
            <button id="filterBtn" class="button" type="button"><img src="./icon/filter.png" alt="" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;opacity:.9;" />筛选</button>
            <span id="activeFilterSummary" class="meta" style="font-size:12px;color:#6b7280;"></span>
          </div>
          <div id="filterPanelWrap" class="filter-wrap" aria-hidden="true">
            <div id="filterPanel" class="filter-panel" role="dialog" aria-label="筛选">
              <div class="filter-section">
                <div class="filter-title">类别</div>
                <div id="fltTypeGroup" class="type-group" role="group" aria-label="类别">
                  ${['室内运动','户外运动','音乐','艺术','娱乐','其他'].map(o=>`<button type="button" class="type-btn" data-value="${o}" aria-pressed="false">${o}</button>`).join('')}
                </div>
                <input id="fltType" type="hidden" value="" />
              </div>
              <div class="filter-section">
                <div class="filter-title">日期</div>
                <input id="fltDate" class="input" type="date" />
              </div>
              <div class="filter-section" id="fltTimeRowStart">
                <div class="filter-title">开始时间</div>
                <div class="time-proxy segments" aria-label="开始时间">
                  <input id="fltSHour" class="input time-seg" type="tel" inputmode="numeric" maxlength="2" placeholder="HH" aria-label="时" />
                  <span class="seg-sep">:</span>
                  <input id="fltSMin" class="input time-seg" type="tel" inputmode="numeric" maxlength="2" placeholder="MM" aria-label="分" />
                </div>
                <div class="meta" style="font-size:12px;color:#6b7280;">仅显示开始时间不早于所选时间的活动</div>
              </div>
              <div class="filter-section">
                <div class="filter-title">地点</div>
                <input id="fltLoc" class="input" placeholder="省/市/区/地址 关键词" />
              </div>
              <div class="row" style="gap:8px;">
                <button id="applyFilter" class="button" type="button">应用</button>
                <button id="clearFilter" class="button" type="button" style="background:#6b7280;">清除</button>
                <button id="closeFilter" class="button" type="button" style="background:#6b7280;">关闭</button>
              </div>
            </div>
          </div>
          <div id="list">加载中...</div>
        </div>
      </div>`;

    bindLogout();
    try {
      const res = await Api.post('getActivities', { requesterId: Api.getUserId && Api.getUserId() });
      if (res.code !== 0) throw new Error(res.message || '加载失败');
      const all = Array.isArray(res.data) ? res.data : [];
      const listEl = document.getElementById('list');
      const inputEl = document.getElementById('searchTitle');
      const renderList = (arr) => {
        const html = (arr||[]).map(a => renderActivityItem(a)).join('');
        listEl.innerHTML = `<ul class="list">${html || '<li class="meta">暂无匹配的活动</li>'}</ul>`;
      };
      // 状态：筛选条件
      const state = { kw: '', type: '', date: '', start: '', loc: '' };

      function summarize() {
        const parts = [];
        if (state.type) parts.push(`类别:${state.type}`);
        if (state.date) parts.push(`日期:${state.date}`);
        if (state.start) parts.push(`开始≥${state.start}`);
        if (state.loc) parts.push(`地点:${state.loc}`);
        const el = document.getElementById('activeFilterSummary');
        if (el) el.textContent = parts.join(' · ');
      }

      function norm(s){ return String(s||'').trim().toLowerCase(); }
      function timeToNum(t){ const m=(t||'').match(/^(\d{2}):(\d{2})$/); if(!m) return NaN; return parseInt(m[1],10)*60+parseInt(m[2],10); }
      function getBegin(a){ return a.begin_time || a.start_time || a.timeSlot || ''; }
      function getRegionStr(a){ return [a.province,a.city,a.area,a.location].filter(Boolean).join(' '); }

      function applyFilters() {
        let arr = all.slice();
        const kw = state.kw;
        if (kw) arr = arr.filter(a => norm(a.name).includes(kw));
        if (state.type) arr = arr.filter(a => String(a.type||'') === state.type);
        if (state.date) arr = arr.filter(a => String(a.date||'') === state.date);
        if (state.start) {
          const v = timeToNum(state.start);
          arr = arr.filter(a => {
            const t = timeToNum(getBegin(a));
            return isNaN(v) || isNaN(t) ? true : (t >= v);
          });
        }
        if (state.loc) {
          const key = norm(state.loc);
          arr = arr.filter(a => norm(getRegionStr(a)).includes(key));
        }
        renderList(arr);
        summarize();
      }

      // 初次渲染
      renderList(all);
      summarize();

      if (inputEl) {
        inputEl.addEventListener('input', () => {
          state.kw = norm(inputEl.value);
          applyFilters();
        });
      }

      // 筛选面板行为
      const wrap = document.getElementById('filterPanelWrap');
      const panel = document.getElementById('filterPanel');
      const btn = document.getElementById('filterBtn');
      const applyBtn = document.getElementById('applyFilter');
      const clearBtn = document.getElementById('clearFilter');
      const closeBtn = document.getElementById('closeFilter');
      const typeGroup = document.getElementById('fltTypeGroup');
      const typeHidden = document.getElementById('fltType');
      const dateInp = document.getElementById('fltDate');
      const sHour = document.getElementById('fltSHour');
      const sMin = document.getElementById('fltSMin');
      const locInp = document.getElementById('fltLoc');

      // 分段时间输入辅助：限制数字、范围，生成 HH:MM
      function numericOnly(el, maxLen) {
        if (!el) return;
        el.addEventListener('input', () => {
          let v = (el.value || '').replace(/\D+/g, '');
          if (typeof maxLen === 'number') v = v.slice(0, maxLen);
          el.value = v;
        });
      }
      function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
      function getSegTime(){
        const hh = (sHour && sHour.value || '').padStart(2,'0');
        const mm = (sMin && sMin.value || '').padStart(2,'0');
        if (/^\d{2}$/.test(hh) && /^\d{2}$/.test(mm)) {
          const H = String(clamp(parseInt(hh,10)||0,0,23)).padStart(2,'0');
          const M = String(clamp(parseInt(mm,10)||0,0,59)).padStart(2,'0');
          return `${H}:${M}`;
        }
        return '';
      }

      // 绑定分段输入限制与自动跳转
      numericOnly(sHour, 2);
      numericOnly(sMin, 2);
      if (sHour) sHour.addEventListener('input', () => { if (sHour.value.length >= 2) sMin && sMin.focus(); });

      function prefillTimeSegs(){
        if (!sHour || !sMin) return;
        const v = state.start || '';
        const m = (v||'').match(/^(\d{2}):(\d{2})$/);
        if (m) { sHour.value = m[1]; sMin.value = m[2]; }
        else { sHour.value = ''; sMin.value = ''; }
      }
      function openPanel(){ if (wrap){ prefillTimeSegs(); wrap.classList.add('open'); wrap.setAttribute('aria-hidden','false'); } }
      function closePanel(){ if (wrap){ wrap.classList.remove('open'); wrap.setAttribute('aria-hidden','true'); } }

      if (btn) btn.addEventListener('click', () => openPanel());
      if (closeBtn) closeBtn.addEventListener('click', () => closePanel());
      if (wrap) wrap.addEventListener('click', (e)=>{ if (e.target === wrap) closePanel(); });

      if (typeGroup) {
        typeGroup.addEventListener('click', (e) => {
          const b = e.target && e.target.closest('.type-btn');
          if (!b) return;
          const already = b.classList.contains('active');
          Array.from(typeGroup.querySelectorAll('.type-btn')).forEach(x=>{ x.classList.remove('active'); x.setAttribute('aria-pressed','false'); });
          if (!already) {
            b.classList.add('active'); b.setAttribute('aria-pressed','true');
            if (typeHidden) typeHidden.value = b.getAttribute('data-value') || '';
          } else {
            if (typeHidden) typeHidden.value = '';
          }
        });
      }

      if (applyBtn) applyBtn.addEventListener('click', () => {
        state.type = (typeHidden && typeHidden.value) || '';
        state.date = (dateInp && dateInp.value) || '';
        // 从分段时分读取
        state.start = getSegTime();
        state.loc = (locInp && locInp.value) || '';
        applyFilters();
        closePanel();
      });
      if (clearBtn) clearBtn.addEventListener('click', () => {
        state.type = ''; state.date = ''; state.start = ''; state.loc = '';
        if (typeHidden) typeHidden.value = '';
        if (dateInp) dateInp.value = '';
        if (locInp) locInp.value = '';
        if (sHour) sHour.value = '';
        if (sMin) sMin.value = '';
        Array.from((typeGroup && typeGroup.querySelectorAll('.type-btn'))||[]).forEach(x=>{ x.classList.remove('active'); x.setAttribute('aria-pressed','false'); });
        applyFilters();
      });
    } catch (e) {
      document.getElementById('list').innerHTML = `<div class="meta">加载失败：${e.message || e}</div>`;
    }
  }

  async function renderActivityDetail(id) {
    app.innerHTML = nav() + `
      <div class="container detail-page">
        <div class="card">
          <div class="title" id="pageTitle">加载中...</div>
          <div id="detail">加载中...</div>
          <div class="row detail-actions">
            <button id="joinBtn" class="button" style="display:none">报名</button>
            <button id="leaveBtn" class="button" style="display:none; background:#ef4444">取消报名</button>
            <button id="editBtn" class="button" style="display:none; background:#10b981">编辑活动</button>
            <button id="delBtn" class="button" style="display:none; background:#6b7280">删除活动</button>
          </div>
          <div id="participants" class="participants"></div>
        </div>
        <!-- 移动端底部操作栏 -->
        <div class="action-bar">
          <button id="joinBtnM" class="button" style="display:none">报名</button>
          <button id="leaveBtnM" class="button" style="display:none; background:#ef4444">取消报名</button>
          <button id="editBtnM" class="button" style="display:none; background:#10b981">编辑活动</button>
          <button id="delBtnM" class="button" style="display:none; background:#6b7280">删除活动</button>
        </div>
      </div>`;
    bindLogout();

    let data;
    try {
      const res = await Api.post('getActivityDetail', { id, requesterId: Api.getUserId && Api.getUserId() });
      if (res.code !== 0) throw new Error(res.message || '加载失败');
      data = res.data || {};
      const parts = Array.isArray(data.participants) ? data.participants : [];
      const joinedCount = data.joinedPeople || data.joined_people || parts.length || 0;
      const totalCount = data.totalPeople || data.total_people || 0;
      const creatorName = String(data.creator_name || (data.creator && data.creator.username) || data.creator || (parts[0] && parts[0].username) || '');
      const creatorId = String(data.creator_id || '');
      const type = data.type || '';
      const pageTitleEl = document.getElementById('pageTitle');
      if (pageTitleEl) pageTitleEl.innerHTML = `${data.name || ''} ${type ? `<span class="badge badge-type">${type}</span>` : ''}`;
      document.getElementById('detail').innerHTML = `
        ${Number(data.expire)===1 ? '<div class="meta" style="color:#f59e0b;">已过期（结束后24小时自动过期）</div>' : ''}
        <div class="meta">${data.date || ''} ${data.begin_time || ''}</div>
        <div class="meta">地点：${[data.province, data.city, data.area].filter(Boolean).join(' ')} ${data.location || ''}</div>
        <div class="meta">人数：${joinedCount} / ${totalCount}</div>
        <div class="meta">创建者：${creatorName || '未知'}</div>
        <div class="meta">发起者联系方式：${data.contact ? data.contact : '未提供'}</div>
      `;
      // 渲染参与者列表（列表形式，用户名（昵称），标注发起者）
      const participantsWrap = document.getElementById('participants');
      if (participantsWrap) {
        if (parts.length) {
          const items = parts.map(p=>{
            const uname = String(p && p.username || '');
            const nick = String(p && p.nickname || '');
            const text = nick ? `${uname}（${nick}）` : `${uname}`;
            const isCreator = uname && (uname === creatorName);
            const badge = isCreator ? '<span class="badge-creator">发起者</span>' : '';
            // 只有发起者或管理员（已由后端补充）可见他人的手机号；前端仅按创建者控制显示
            const cur = Api.getUser() || {};
            const meIsCreator = String(cur.userId||'') === String(creatorId||'');
            const phoneForCreator = meIsCreator && p && p.phone ? `<span class="participant-phone">${p.phone}</span>` : '';
            return `<li class="participant-item"><span class="participant-name">${text}</span><span class="participant-right">${phoneForCreator}${badge}</span></li>`;
          }).join('');
          participantsWrap.innerHTML = `<div class="section-title">参与者</div><ul class="participants-list">${items}</ul>`;
        } else {
          participantsWrap.innerHTML = `<div class="section-title">参与者</div><div class="meta">暂无参与者</div>`;
        }
      }
      // 仅作者可见删除/编辑按钮；作者不显示报名/取消报名按钮
      const cur = Api.getUser();
      const creator = String(creatorId);
      const me = String((cur && cur.userId) || '');
      const delBtn = document.getElementById('delBtn');
      const delBtnM = document.getElementById('delBtnM');
      const editBtn = document.getElementById('editBtn');
      const editBtnM = document.getElementById('editBtnM');
      const canDelete = (creator && me && creator === me);
      if (delBtn) delBtn.style.display = canDelete ? '' : 'none';
      if (delBtnM) delBtnM.style.display = canDelete ? '' : 'none';
      if (editBtn) editBtn.style.display = canDelete ? '' : 'none';
      if (editBtnM) editBtnM.style.display = canDelete ? '' : 'none';
      if (canDelete) {
        const jb = document.getElementById('joinBtn');
        const lb = document.getElementById('leaveBtn');
        const jbm = document.getElementById('joinBtnM');
        const lbm = document.getElementById('leaveBtnM');
        if (jb) jb.style.display = 'none';
        if (lb) lb.style.display = 'none';
        if (jbm) jbm.style.display = 'none';
        if (lbm) lbm.style.display = 'none';
      }

      // 过期或报名状态下的按钮切换（非发起者）。发起者已在上方强制隐藏 join/leave，这里不再改动。
      if (!canDelete) {
        if (Number(data.expire) === 1) {
          const joinBtn = document.getElementById('joinBtn');
          const leaveBtn = document.getElementById('leaveBtn');
          const joinBtnM = document.getElementById('joinBtnM');
          const leaveBtnM = document.getElementById('leaveBtnM');
          if (joinBtn) { joinBtn.style.display = ''; joinBtn.disabled = true; joinBtn.textContent = '已过期'; joinBtn.style.opacity = '0.6'; }
          if (leaveBtn) { leaveBtn.style.display = ''; leaveBtn.disabled = true; leaveBtn.style.opacity = '0.6'; }
          if (joinBtnM) { joinBtnM.style.display = ''; joinBtnM.disabled = true; joinBtnM.textContent = '已过期'; joinBtnM.style.opacity = '0.6'; }
          if (leaveBtnM) { leaveBtnM.style.display = ''; leaveBtnM.disabled = true; leaveBtnM.style.opacity = '0.6'; }
        } else {
          // 根据是否已报名切换按钮显隐/状态
          const u = Api.getUser() || {};
          const parts = Array.isArray(data.participants) ? data.participants : [];
          const isJoined = parts.some(p => String(p && p.userId) === String(u.userId));
          const joinedCount = data.joinedPeople || data.joined_people || parts.length || 0;
          const totalCount = data.totalPeople || data.total_people || 0;
          const isFull = totalCount > 0 && joinedCount >= totalCount;
          const joinBtn = document.getElementById('joinBtn');
          const leaveBtn = document.getElementById('leaveBtn');
          const joinBtnM = document.getElementById('joinBtnM');
          const leaveBtnM = document.getElementById('leaveBtnM');
          const applyFullState = (btn) => { if (btn) { btn.disabled = true; btn.textContent = '名额已满'; } };
          if (isJoined) {
            if (joinBtn) joinBtn.style.display = 'none';
            if (leaveBtn) leaveBtn.style.display = '';
            if (joinBtnM) joinBtnM.style.display = 'none';
            if (leaveBtnM) leaveBtnM.style.display = '';
          } else {
            if (leaveBtn) leaveBtn.style.display = 'none';
            if (joinBtn) { joinBtn.style.display = ''; if (isFull) applyFullState(joinBtn); }
            if (leaveBtnM) leaveBtnM.style.display = 'none';
            if (joinBtnM) { joinBtnM.style.display = ''; if (isFull) applyFullState(joinBtnM); }
          }
        }
      }
    } catch (e) {
      document.getElementById('detail').innerHTML = `<div class="meta">加载失败：${e.message || e}</div>`;
    }

    // 详情头部已包含联系方式，这里不再重复追加

    const bindJoin = document.getElementById('joinBtn');
    const bindJoinM = document.getElementById('joinBtnM');
    const bindLeave = document.getElementById('leaveBtn');
    const bindLeaveM = document.getElementById('leaveBtnM');
    const bindDel = document.getElementById('delBtn');
    const bindDelM = document.getElementById('delBtnM');
    const bindEdit = document.getElementById('editBtn');
    const bindEditM = document.getElementById('editBtnM');

    if (bindJoin) bindJoin.onclick = () => doJoinLeave('joinActivity');
    if (bindJoinM) bindJoinM.onclick = () => doJoinLeave('joinActivity');
    if (bindLeave) bindLeave.onclick = () => doJoinLeave('leaveActivity');
    if (bindLeaveM) bindLeaveM.onclick = () => doJoinLeave('leaveActivity');

    const doDelete = async () => {
      if (!confirm('确定删除该活动？')) return;
      const u = Api.getUser();
      if (!u || !u.userId) { Api.toast('请先登录'); setTimeout(()=> location.hash = '#/login', 300); return; }
      try {
        const res = await Api.post('deleteActivity', { id, userId: u.userId });
        if (res.code !== 0) throw new Error(res.message || '删除失败');
        Api.toast('删除成功');
        setTimeout(()=> location.hash = '#/home', 800);
      } catch (e) { Api.toast(e.message || '删除失败'); }
    };
    if (bindDel) bindDel.onclick = doDelete;
    if (bindDelM) bindDelM.onclick = doDelete;

    const doEdit = async () => {
      const u = Api.getUser();
      if (!u || !u.userId) { Api.toast('请先登录'); setTimeout(()=> location.hash = '#/login', 300); return; }
      try {
        // 取当前数据作为默认值
        const curName = data.name || '';
        const curArea = data.area || '';
        const curLoc = data.location || '';
        const curDate = data.date || '';
        const curBegin = data.begin_time || '';
        const curEnd = data.end_time || data.endtime || '';
        const curType = data.type || '';
        const curContact = data.contact || '';
        const curTotal = String(data.total_people || data.totalPeople || '');
        const curDesc = data.description || '';

        const name = prompt('活动名称', curName);
        if (name === null) return; // cancel
        if (!assertClean(name, '活动名称')) return;
        const area = prompt('所在区', curArea); if (area === null) return;
        const location = prompt('详细地址', curLoc); if (location === null) return; if (!assertClean(location, '详细地址')) return;
        const dateStr = prompt('日期(YYYY-MM-DD)', curDate); if (dateStr === null) return;
        const begin_time = prompt('开始时间(HH:MM)', curBegin); if (begin_time === null) return;
        const endtime = prompt('结束时间(HH:MM)', curEnd); if (endtime === null) return;
        const type = prompt('类型', curType); if (type === null) return;
        const contact = prompt('联系方式(11位手机号)', curContact); if (contact === null) return;
        const totalPeopleStr = prompt('人数(整数)', curTotal); if (totalPeopleStr === null) return;
        const description = prompt('详细说明', curDesc); if (description === null) return; if (!assertClean(description, '详细说明')) return;

        if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateStr)) { Api.toast('日期格式不正确'); return; }
        if (!/^\d{2}:\d{2}$/.test(begin_time)) { Api.toast('开始时间格式不正确'); return; }
        if (!/^\d{2}:\d{2}$/.test(endtime)) { Api.toast('结束时间格式不正确'); return; }
        if (!/^\d{11}$/.test(String(contact))) { Api.toast('手机号格式不正确'); return; }
        const totalPeople = Number(totalPeopleStr);
        if (!Number.isInteger(totalPeople) || totalPeople <= 0) { Api.toast('人数不正确'); return; }

        const payload = { id, userId: u.userId, name: name.trim(), area: area.trim(), location: location.trim(), date: dateStr, begin_time, endtime, type: (type||'').trim(), contact: String(contact).trim(), totalPeople, description: description.trim() };
        const res = await Api.post('updateActivity', payload);
        if (res.code !== 0) throw new Error(res.message || '更新失败');
        Api.toast('已更新');
        setTimeout(()=> route(), 500);
      } catch (e) { Api.toast(e.message || '更新失败'); }
    };
    if (bindEdit) bindEdit.onclick = doEdit;
    if (bindEditM) bindEditM.onclick = doEdit;

    async function doJoinLeave(api){
      const u = Api.getUser();
      if (!u || !u.userId) { Api.toast('请先登录'); setTimeout(()=> location.hash = '#/login', 300); return; }
      try {
        // 发起者不能退出自己的活动
        const creatorId = String((data && (data.creator_id)) || '');
        if (api === 'leaveActivity' && String(u.userId) === creatorId) {
          Api.toast('发起者不能退出自己的活动，可进行编辑或删除');
          return;
        }
        let payload = { id, userId: u.userId };
        if (api === 'joinActivity') {
          const consent = confirm('是否向发起者展示你的电话号码？\n仅发起者可见你的号码，其他参与者不可见。');
          payload.consentPhone = !!consent;
          if (consent) {
            try {
              const info = await Api.post('getUserPublicInfo', { userId: u.userId });
              const phone = info && info.data && info.data.iphone_num;
              if (phone && /^\d{11}$/.test(phone)) payload.phone = phone;
            } catch {}
          }
        }
        const res = await Api.post(api, payload);
        if (res.code !== 0) throw new Error(res.message || '操作失败');
        Api.toast('成功');
        setTimeout(()=> route(), 500);
      } catch (e) { Api.toast(e.message || '失败'); }
    }
  }

  async function renderCreate() {
    if (!requireLogin()) return;
    const today = (()=>{ const d=new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; })();
    const typeOptions = ['室内运动','户外运动','音乐','艺术','娱乐','其他'];
    const districts = ['越秀区','荔湾区','海珠区','天河区','白云区','黄埔区','番禺区','花都区','南沙区','从化区','增城区'];
    const peopleOptions = Array.from({ length: 9 }, (_, i) => i + 2); // 2..10
    const isDesktop = window.matchMedia && window.matchMedia('(min-width: 768px)').matches;

    app.innerHTML = nav() + `
      <div class="container">
        <div class="card">
          <div class="title">创建活动</div>
          <div class="row column"><label class="field-label" for="name">活动名称</label><input id="name" class="input" placeholder="活动名称" /></div>

          <div class="row column">
            <label class="field-label" for="type">活动类型</label>
            <div id="typeGroup" class="type-group" role="group" aria-label="活动类型">
              ${typeOptions.map(o=>`<button type="button" class="type-btn" data-value="${o}" aria-pressed="false">${o}</button>`).join('')}
            </div>
            <input id="type" type="hidden" value="" />
          </div>

          <div class="row column">
            <label class="field-label" for="province">省</label>
            <select id="province" class="input"></select>
          </div>
          <div class="row column">
            <label class="field-label" for="city">市</label>
            <select id="city" class="input"></select>
          </div>
          <div class="row column">
            <label class="field-label" for="area">区</label>
            <select id="area" class="input"></select>
          </div>
          <div class="row column"><label class="field-label" for="location">详细地址</label><input id="location" class="input" placeholder="详细地址（门牌号等）" /></div>

          <div class="row column clickable" id="dateRow">
            <label class="field-label" for="date">日期</label>
            ${isDesktop ? `
              <input id="date" class="input date-native" type="date" min="${today}" max="9999-12-31" />
            ` : `
              <div class="date-proxy segments" aria-label="日期">
                <input id="ySeg" class="input date-seg" type="tel" inputmode="numeric" maxlength="4" placeholder="YYYY" aria-label="年" />
                <span class="seg-sep">/</span>
                <input id="mSeg" class="input date-seg" type="tel" inputmode="numeric" maxlength="2" placeholder="MM" aria-label="月" />
                <span class="seg-sep">/</span>
                <input id="dSeg" class="input date-seg" type="tel" inputmode="numeric" maxlength="2" placeholder="DD" aria-label="日" />
                <span id="openCalendar" class="icon-cal" aria-hidden="true" title="打开日历">📅</span>
              </div>
              <input id="date" class="input date-native" type="date" min="${today}" max="9999-12-31" placeholder="YYYY年MM月DD日" />
            `}
          </div>
          <div class="row column" id="timeRowStart">
            <label class="field-label label-mobile" for="timeSlot">开始时间</label>
            <div class="time-proxy segments" aria-label="开始时间">
              <input id="sHour" class="input time-seg" type="tel" inputmode="numeric" maxlength="2" placeholder="HH" aria-label="时" />
              <span class="seg-sep">:</span>
              <input id="sMin" class="input time-seg" type="tel" inputmode="numeric" maxlength="2" placeholder="MM" aria-label="分" />
            </div>
            <input id="timeSlot" class="input time-native" type="time" step="60" min="00:00" max="23:59" lang="zh-CN" placeholder="HH:MM" />
          </div>
          <div class="row column" id="timeRowEnd">
            <label class="field-label label-mobile" for="endtime">结束时间</label>
            <div class="time-proxy segments" aria-label="结束时间">
              <input id="eHour" class="input time-seg" type="tel" inputmode="numeric" maxlength="2" placeholder="HH" aria-label="时" />
              <span class="seg-sep">:</span>
              <input id="eMin" class="input time-seg" type="tel" inputmode="numeric" maxlength="2" placeholder="MM" aria-label="分" />
            </div>
            <input id="endtime" class="input time-native" type="time" step="60" min="00:00" max="23:59" lang="zh-CN" placeholder="HH:MM" />
          </div>

          <div class="row column">
            <label class="field-label" for="contact">联系方式</label>
            <input id="contact" class="input" placeholder="联系方式（11位手机号）" maxlength="11" />
            <span id="quickFillPhone" class="meta" style="color:#3b82f6; cursor:pointer; font-size:12px; margin:4px 0 0; width:fit-content;">快捷填入</span>
          </div>

          <div class="row column">
            <label class="field-label" for="totalPeople">活动人数</label>
            <select id="totalPeople" class="input">
              <option value="">选择活动人数</option>
              ${peopleOptions.map(n=>`<option value="${n}">${n}人</option>`).join('')}
            </select>
          </div>

          <div class="row column"><label class="field-label" for="description">详细说明</label><textarea id="description" class="input" placeholder="详细说明" style="height:120px"></textarea></div>

          <div class="row"><button id="submit" class="button">提交</button></div>
        </div>
      </div>
      `;
      bindLogout();

      const dateRow = document.getElementById('dateRow');
      const dateInput = document.getElementById('date');
      // 省市区级联选择（优先从 site/areas.json 加载完整数据，失败则回退到 window.Regions）
    const provEl = document.getElementById('province');
    const cityEl = document.getElementById('city');
    const areaEl = document.getElementById('area');
    function setOptions(sel, arr, placeholder){
      const opts = [ `<option value="">${placeholder}</option>` ].concat((arr||[]).map(v=>`<option value="${v}">${v}</option>`));
      sel.innerHTML = opts.join('');
    }
    function onProvinceChange(){
      const province = provEl.value;
      const cities = province && window.Regions && window.Regions[province] ? Object.keys(window.Regions[province]) : [];
      setOptions(cityEl, cities, '请选择城市');
      setOptions(areaEl, [], '请选择区');
    }
    function onCityChange(){
      const province = provEl.value;
      const city = cityEl.value;
      const areas = (province && city && window.Regions && window.Regions[province] && window.Regions[province][city]) ? window.Regions[province][city] : [];
      setOptions(areaEl, areas, '请选择区');
    }
    // init: 从后端 API 获取地区数据（KV 存储），失败则不使用本地回退
    try {
      const res = await fetch('/api/areas', { cache: 'no-store' });
      const payload = res.ok ? await res.json() : null;
      const data = payload && payload.data && typeof payload.data === 'object' ? payload.data : null;
      if (data) {
        window.Regions = data;
      } else {
        window.Regions = {};
      }
    } catch (_) {
      window.Regions = {};
      if (window.Api && Api.toast) Api.toast('地区数据加载失败');
    }
    const provinces = window.Regions ? Object.keys(window.Regions) : [];
    setOptions(provEl, provinces, '请选择省份');
    setOptions(cityEl, [], '请选择城市');
    setOptions(areaEl, [], '请选择区');
    provEl.addEventListener('change', onProvinceChange);
    cityEl.addEventListener('change', onCityChange);

      // 快捷填入手机号
      const quickFill = document.getElementById('quickFillPhone');
      if (quickFill) quickFill.addEventListener('click', async () => {
        const u = Api.getUser();
        if (!u || !u.userId) { Api.toast('请先登录'); return; }
        try {
          const r = await Api.post('getUserPublicInfo', { userId: u.userId });
          const phone = r && r.data && r.data.iphone_num;
          if (phone && /^\d{11}$/.test(phone)) {
            const el = document.getElementById('contact');
            if (el) el.value = phone;
            Api.toast('已填入手机号');
          } else {
            Api.toast('未设置手机号，请先在“我的资料”中设置');
          }
        } catch (e) {
          Api.toast('获取手机号失败');
        }
      });
    // ===== 活动类型按钮绑定 =====
    const typeGroup = document.getElementById('typeGroup');
    const typeHidden = document.getElementById('type');
    if (typeGroup) {
      typeGroup.addEventListener('click', (e) => {
        const btn = e.target && e.target.closest('.type-btn');
        if (!btn) return;
        // 切换选中样式
        Array.from(typeGroup.querySelectorAll('.type-btn')).forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed','true');
        if (typeHidden) typeHidden.value = btn.getAttribute('data-value') || '';
      });
    }
    const ySeg = document.getElementById('ySeg');
    const mSeg = document.getElementById('mSeg');
    const dSeg = document.getElementById('dSeg');
    const openCal = document.getElementById('openCalendar');
    function openPicker() {
      if (!dateInput) return;
      if (typeof dateInput.showPicker === 'function') {
        try { dateInput.showPicker(); return; } catch(_) {}
      }
      dateInput.focus();
      dateInput.click();
    }
    // isDesktop computed above for conditional rendering
    if (dateRow && dateInput) {
      dateRow.addEventListener('click', (e) => {
        // 仅桌面端允许点击空白打开日历；移动端不触发
        if (!isDesktop) return;
        if (e.target === dateInput || e.target === ySeg || e.target === mSeg || e.target === dSeg || e.target === openCal) return;
        openPicker();
      });
    }
    if (openCal) openCal.addEventListener('click', (e) => {
      // 仅桌面端响应图标点击；移动端取消日历功能
      if (!isDesktop) return;
      e.preventDefault(); e.stopPropagation(); openPicker();
    });

    // 分段输入：仅允许数字，自动前移/后移，并同步到原生 date
    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
    function syncFromSegments() {
      const y = (ySeg?.value || '').padStart(4, '0');
      const m = (mSeg?.value || '').padStart(2, '0');
      const d = (dSeg?.value || '').padStart(2, '0');
      if (/^\d{4}$/.test(y) && /^\d{2}$/.test(m) && /^\d{2}$/.test(d)) {
        // 简单范围限定
        const ym = clamp(parseInt(m,10)||0,1,12);
        const yd = clamp(parseInt(d,10)||0,1,31);
        const mm = String(ym).padStart(2,'0');
        const dd = String(yd).padStart(2,'0');
        dateInput.value = `${y}-${mm}-${dd}`;
      }
    }
    function numericOnly(el, maxLen) {
      el.addEventListener('input', () => {
        let v = el.value.replace(/\D+/g, '');
        if (typeof maxLen === 'number') v = v.slice(0, maxLen);
        el.value = v;
      });
    }
    if (ySeg) numericOnly(ySeg, 4);
    if (mSeg) numericOnly(mSeg, 2);
    if (dSeg) numericOnly(dSeg, 2);
    if (ySeg) ySeg.addEventListener('input', () => { if (ySeg.value.length >= 4) mSeg?.focus(); syncFromSegments(); });
    if (mSeg) mSeg.addEventListener('input', () => { if (mSeg.value.length >= 2) dSeg?.focus(); syncFromSegments(); });
    if (dSeg) dSeg.addEventListener('input', () => { syncFromSegments(); });

    // 原生日历选择后，拆分回填
    if (dateInput) dateInput.addEventListener('change', () => {
      const v = dateInput.value || '';
      const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        if (ySeg) ySeg.value = m[1];
        if (mSeg) mSeg.value = m[2];
        if (dSeg) dSeg.value = m[3];
      }
    });

    // 桌面端：限制年份只能 4 位（用户手动输入时）
    if (dateInput && isDesktop) {
      dateInput.addEventListener('input', () => {
        const v = dateInput.value || '';
        const parts = v.split('-');
        if (parts[0] && parts[0].length > 4) {
          parts[0] = parts[0].slice(0, 4);
          dateInput.value = parts.join('-');
        }
      });
    }

    // 桌面端不再显示叠加提示，避免与原生渲染重叠

    // ===== 时间分段（手机端）绑定 =====
    const sHour = document.getElementById('sHour');
    const sMin = document.getElementById('sMin');
    const eHour = document.getElementById('eHour');
    const eMin = document.getElementById('eMin');

    function numericOnlyTime(el) {
      el && el.addEventListener('input', () => { el.value = el.value.replace(/\D+/g, ''); });
    }
    [sHour, sMin, eHour, eMin].forEach(el => numericOnlyTime(el));

    function syncStartTime() {
      const hh = clamp(parseInt(sHour?.value||'',10)||0, 0, 23);
      const mm = clamp(parseInt(sMin?.value||'',10)||0, 0, 59);
      if (sHour?.value.length === 2 && sMin?.value.length === 2) {
        const v = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
        const t = document.getElementById('timeSlot');
        if (t) t.value = v;
      }
    }
    function syncEndTime() {
      const hh = clamp(parseInt(eHour?.value||'',10)||0, 0, 23);
      const mm = clamp(parseInt(eMin?.value||'',10)||0, 0, 59);
      if (eHour?.value.length === 2 && eMin?.value.length === 2) {
        const v = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
        const t = document.getElementById('endtime');
        if (t) t.value = v;
      }
    }
    sHour && sHour.addEventListener('input', () => { if (sHour.value.length >= 2) sMin?.focus(); syncStartTime(); });
    sMin && sMin.addEventListener('input', () => { syncStartTime(); });
    eHour && eHour.addEventListener('input', () => { if (eHour.value.length >= 2) eMin?.focus(); syncEndTime(); });
    eMin && eMin.addEventListener('input', () => { syncEndTime(); });

    // 原生 time 变更时（桌面端），拆分回填到分段（用于切换或一致性）
    const startNative = document.getElementById('timeSlot');
    const endNative = document.getElementById('endtime');
    startNative && startNative.addEventListener('change', () => {
      const v = startNative.value || '';
      const m = v.match(/^(\d{2}):(\d{2})$/);
      if (m) { if (sHour) sHour.value = m[1]; if (sMin) sMin.value = m[2]; }
    });
    endNative && endNative.addEventListener('change', () => {
      const v = endNative.value || '';
      const m = v.match(/^(\d{2}):(\d{2})$/);
      if (m) { if (eHour) eHour.value = m[1]; if (eMin) eMin.value = m[2]; }
    });

    document.getElementById('submit').onclick = async () => {
      const u = Api.getUser();
      if (!u || !u.userId) return Api.toast('请先登录');

      const name = val('name');
      const type = document.getElementById('type').value;
      const province = val('province');
      const city = val('city');
      const area = val('area');
      const locationDetail = val('location');
      const date = val('date');
      const beginTime = val('timeSlot');
      const endtime = val('endtime');
      const contact = val('contact');
      const totalPeople = Number(document.getElementById('totalPeople').value || 0);
      const description = val('description');

      // Banned words checks
      if (!assertClean(name, '活动名称')) return;
      if (!assertClean(locationDetail, '详细地址')) return;
      if (!assertClean(description, '详细说明')) return;

      // Validations
      if (!name) return Api.toast('请填写活动名称');
      if (!type) return Api.toast('请选择活动类型');
      if (!province) return Api.toast('请输入省份');
      if (!city) return Api.toast('请输入城市');
      if (!area) return Api.toast('请输入区');
      if (!locationDetail) return Api.toast('请填写详细地址');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Api.toast('请输入正确日期: YYYY-MM-DD');
      if (!/^\d{2}:\d{2}$/.test(beginTime)) return Api.toast('请输入开始时间: HH:MM');
      if (!/^\d{2}:\d{2}$/.test(endtime)) return Api.toast('请输入结束时间: HH:MM');
      const toMin = t => { const [h,m] = String(t).split(':'); return (parseInt(h)||0)*60+(parseInt(m)||0); };
      if (toMin(endtime) <= toMin(beginTime)) return Api.toast('结束时间需晚于开始时间');
      if (!/^\d{11}$/.test(contact)) return Api.toast('请输入11位手机号');
      if (!(totalPeople >= 2 && totalPeople <= 10)) return Api.toast('请选择活动人数');
      if (!description) return Api.toast('请填写详细说明');

      const payload = { name, type, province, city, area, location: locationDetail, date, begin_time: beginTime, endtime, contact, totalPeople, description, creatorId: u.userId };

      try {
        const res = await Api.post('uploadActivity', payload);
        if (res.code !== 0) throw new Error(res.message || '创建失败');
        Api.toast('创建成功');
        setTimeout(()=> location.hash = '#/home', 800);
      } catch(e){ Api.toast(e.message || '创建失败'); }
    };
    function val(id){ return document.getElementById(id).value.trim(); }
  }



  async function renderMyActivities() {
    if (!requireLogin()) return;
    app.innerHTML = nav() + `
      <div class="container">
        <div class="card">
          <div class="title">我创建的活动</div>
          <div id="list">加载中...</div>
        </div>
      </div>`;
    bindLogout();
    const u = Api.getUser();
    if (!u || !u.userId) { document.getElementById('list').innerHTML = '<div class="meta">请先登录</div>'; return; }
    try {
      const res = await Api.post('getUserActivities', { creatorId: u.userId, page: 1, pageSize: 50 });
      if (res.code !== 0) throw new Error(res.message || '加载失败');
      const list = (res.data && res.data.list) || [];
      const html = list.map(a => renderActivityItem(a)).join('');
      document.getElementById('list').innerHTML = `<ul class="list">${html || '<li class="meta">暂无活动</li>'}</ul>`;
    } catch (e) { document.getElementById('list').innerHTML = `<div class="meta">加载失败：${e.message||e}</div>`; }
  }

  async function renderJoinedActivities() {
    if (!requireLogin()) return;
    app.innerHTML = nav() + `
      <div class="container">
        <div class="card">
          <div class="title">我加入的活动</div>
          <div id="list">加载中...</div>
        </div>
      </div>`;
    bindLogout();
    const u = Api.getUser();
    if (!u || !u.userId) { document.getElementById('list').innerHTML = '<div class="meta">请先登录</div>'; return; }
    try {
      const res = await Api.post('getActivities', { includeExpired: true, requesterId: Api.getUserId && Api.getUserId() });
      if (res.code !== 0) throw new Error(res.message || '加载失败');
      const list = (Array.isArray(res.data) ? res.data : []).filter(a => (a.participants||[]).some(p=>String(p && p.userId)===String(u.userId)));
      const html = list.map(a => renderActivityItem(a)).join('');
      document.getElementById('list').innerHTML = `<ul class="list">${html || '<li class="meta">暂无</li>'}</ul>`;
    } catch (e) { document.getElementById('list').innerHTML = `<div class="meta">加载失败：${e.message||e}</div>`; }
  }

  async function renderUserInfo() {
    if (!requireLogin()) return;
    app.innerHTML = nav() + `
      <div class="container">
        <div class="card">
          <div class="title">我的资料
            <div class="meta" id="uid_line">用户ID：<code id="uid_text"></code></div>
          </div>
          <div class="row column"><label class="field-label" for="nickname">昵称</label><input id="nickname" class="input" placeholder="昵称" /></div>
          <div class="row column"><label class="field-label" for="gender">性别</label>
            <select id="gender" class="input">
              <option value="1">男</option>
              <option value="2">女</option>
              <option value="0">未知</option>
            </select>
          </div>
          <div class="row column"><label class="field-label" for="iphone_num">手机号</label><input id="iphone_num" class="input" placeholder="11位手机号" maxlength="11" inputmode="numeric" /></div>
          <div class="row column"><label class="field-label" for="bio">个人简介</label><textarea id="bio" class="input" placeholder="个人简介" rows="3" style="height:100px; white-space:pre-wrap; resize: vertical;"></textarea></div>
          <div class="row"><button id="save" class="button">保存</button></div>
        </div>
      </div>`;
    bindLogout();
    const u = Api.getUser();
    if (!u || !u.userId) return (app.querySelector('.card').innerHTML += '<div class="meta">请先登录</div>');
    const uidText = document.getElementById('uid_text');
    if (uidText) uidText.textContent = u.userId || '';
    try {
      const r = await Api.post('getUserPublicInfo', { userId: u.userId });
      if (r.code === 0 && r.data) {
        document.getElementById('nickname').value = r.data.nickname || r.data.username || '';
        document.getElementById('bio').value = r.data.bio || '';
        document.getElementById('gender').value = typeof r.data.gender==='number'? String(r.data.gender):'0';
        if (typeof r.data.iphone_num !== 'undefined') document.getElementById('iphone_num').value = r.data.iphone_num || '';
      }
    } catch {}
    document.getElementById('save').onclick = async () => {
      try {
        const phone = (document.getElementById('iphone_num').value || '').trim();
        const nickname = (document.getElementById('nickname').value || '').trim();
        const bio = (document.getElementById('bio').value || '').trim();
        if (!assertClean(nickname, '昵称')) return;
        if (!assertClean(bio, '个人简介')) return;
        if (phone && !/^\d{11}$/.test(phone)) return Api.toast('手机号需为11位数字');
        const res = await Api.post('updateUserInfo', {
          userId: u.userId,
          nickname,
          bio,
          gender: parseInt(document.getElementById('gender').value)||0,
          iphone_num: phone
        });
        if (res.code !== 0) throw new Error(res.message || '保存失败');
        Api.toast('保存成功');
      } catch (e) { Api.toast(e.message || '保存失败'); }
    };
  }

  function renderFeedback() {
    app.innerHTML = nav() + `
      <div class="container">
        <div class="card">
          <div class="title">意见反馈</div>
          <div class="row"><textarea id="content" class="input" placeholder="至少10个字" style="height:120px"></textarea></div>
          <div class="row"><button id="submit" class="button">提交</button></div>
        </div>
      </div>`;
    bindLogout();
    document.getElementById('submit').onclick = async () => {
      const u = Api.getUser();
      if (!u || !u.userId) return Api.toast('请先登录');
      const content = document.getElementById('content').value.trim();
      if (content.length < 10) return Api.toast('请至少填写10个字');
      if (!assertClean(content, '反馈内容')) return;
      try {
        const res = await Api.post('submitFeedback', { userId: u.userId, content });
        if (res.code !== 0) throw new Error(res.message || '提交失败');
        Api.toast('提交成功');
        setTimeout(()=> location.hash = '#/home', 800);
      } catch (e) { Api.toast(e.message || '提交失败'); }
    };
  }

  function renderRegister() {
    app.innerHTML = nav() + `
      <div class="container">
        <div class="card">
          <div class="title">用户注册</div>
          <div class="row column"><label class="field-label" for="reg_username">用户名</label><input id="reg_username" class="input" placeholder="用户名(3-20位)" /></div>
          <div class="row column"><label class="field-label" for="reg_password">密码</label>
            <div class="field-with-icon">
              <input id="reg_password" class="input input-icon-right" type="password" placeholder="密码(6-20位)" />
              <img id="regPwdEye" class="icon-right" src="./icon/password_eyeclose.png" alt="显示密码" />
            </div>
          </div>
          <div class="row column"><label class="field-label" for="reg_phone">手机号</label><input id="reg_phone" class="input" placeholder="11位手机号" maxlength="11" inputmode="numeric" /></div>
          <div class="row" style="align-items:center; gap:8px;">
            <input id="reg_agree" type="checkbox" /> <label for="reg_agree" class="meta">我已阅读并同意隐私政策</label>
          </div>
          <div class="row"><a href="#/login" class="meta" style="color:#3b82f6; text-decoration:none; cursor:pointer;">已有账号？去登陆</a></div>
          <div class="row"><button id="reg_submit" class="button" style="background:#10b981">注册</button></div>
        </div>
      </div>`;
    bindLogout();
    // 注册页密码显示/隐藏（iOS 安全掩码）
    setupPwdToggle(document.getElementById('reg_password'), document.getElementById('regPwdEye'));
    document.getElementById('reg_submit').onclick = async () => {
      const username = document.getElementById('reg_username').value.trim();
      const password = document.getElementById('reg_password').value;
      const phone = (document.getElementById('reg_phone').value || '').trim();
      const agree = document.getElementById('reg_agree').checked;
      if (username.length < 3 || username.length > 20) return Api.toast('用户名长度需在3-20位');
      if (password.length < 6 || password.length > 20) return Api.toast('密码长度需在6-20位');
      if (!/^\d{11}$/.test(phone)) return Api.toast('请输入11位手机号');
      if (!agree) return Api.toast('请勾选隐私政策');
      try {
        const res = await Api.post('userRegister', { username, password, iphone_num: phone, agreePrivacy: true, policyVersion: 'v1' });
        if (res.code !== 0) throw new Error(res.message || '注册失败');
        // 注册成功后自动登录
        try {
          const lr = await Api.post('userLogin', { username, password });
          if (lr.code === 0 && lr.data) {
            const info = {
              token: lr.data && lr.data.token,
              userId: lr.data && lr.data.userId,
              username: lr.data && lr.data.username
            };
            Api.saveUser(info);
            Api.toast('注册成功，已自动登录');
            setTimeout(()=> location.hash = '#/home', 800);
            return;
          }
        } catch(_) { /* 忽略并回退到手动登录 */ }
        Api.toast('注册成功，请登录');
        setTimeout(()=> location.hash = '#/login', 800);
      } catch (e) {
        Api.toast(e.message || '注册失败');
      }
    }
  }

  function renderChangePassword(){
    if (!requireLogin()) return;
    app.innerHTML = nav() + `
      <div class="container">
        <div class="card">
          <div class="title">修改密码</div>
          <div class="row column">
            <label class="field-label" for="oldPwd">当前密码</label>
            <div class="field-with-icon">
              <input id="oldPwd" class="input input-icon-right" type="password" placeholder="请输入当前密码" />
              <img id="oldEye" class="icon-right" src="./icon/password_eyeclose.png" alt="显示密码" />
            </div>
          </div>
          <div class="row column">
            <label class="field-label" for="newPwd">新密码</label>
            <div class="field-with-icon">
              <input id="newPwd" class="input input-icon-right" type="password" placeholder="新密码(6-20位)" />
              <img id="newEye" class="icon-right" src="./icon/password_eyeclose.png" alt="显示密码" />
            </div>
          </div>
          <div class="row column">
            <label class="field-label" for="newPwd2">确认新密码</label>
            <div class="field-with-icon">
              <input id="newPwd2" class="input input-icon-right" type="password" placeholder="再次输入新密码" />
              <img id="new2Eye" class="icon-right" src="./icon/password_eyeclose.png" alt="显示密码" />
            </div>
          </div>
          <div class="row"><button id="submitPwd" class="button">提交</button></div>
        </div>
      </div>`;
    bindLogout();
    const u = Api.getUser();
    // 显示/隐藏密码切换（iOS 安全掩码）
    setupPwdToggle(document.getElementById('oldPwd'), document.getElementById('oldEye'));
    setupPwdToggle(document.getElementById('newPwd'), document.getElementById('newEye'));
    setupPwdToggle(document.getElementById('newPwd2'), document.getElementById('new2Eye'));
    document.getElementById('submitPwd').onclick = async () => {
      const oldPwd = document.getElementById('oldPwd').value;
      const newPwd = document.getElementById('newPwd').value;
      const newPwd2 = document.getElementById('newPwd2').value;
      if (!oldPwd) return Api.toast('请输入当前密码');
      if (newPwd.length < 6 || newPwd.length > 20) return Api.toast('新密码长度需在6-20位');
      if (newPwd !== newPwd2) return Api.toast('两次输入的新密码不一致');
      try {
        if (!u || !u.username) throw new Error('未获取到用户名');
        const res = await Api.post('changePassword', { username: u.username, newPassword: newPwd });
        if (res.code !== 0) throw new Error(res.message || '修改失败');
        Api.toast('修改成功，请使用新密码重新登录');
        Api.clearUser();
        setTimeout(()=> { location.hash = '#/login'; }, 800);
      } catch(e) { Api.toast(e.message || '修改失败'); }
    };
  }

  function bindLogout(){
    const el = document.getElementById('logout');
    if (el) el.addEventListener('click', (e) => { e.preventDefault(); Api.clearUser(); Api.toast('已退出'); setTimeout(() => location.reload(), 500); });
    const reg = document.getElementById('nav-register');
    if (reg) reg.addEventListener('click', (e) => { e.preventDefault(); location.hash = '#/register'; });
    // 顶部 设置 下拉
    const st = document.getElementById('settingsToggle');
    const menu = document.getElementById('settingsMenu');
    if (st && menu) {
      st.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        menu.classList.toggle('open');
      });
      if (!window.__settingsDocListener) {
        window.__settingsDocListener = true;
        document.addEventListener('click', (ev) => {
          const m = document.getElementById('settingsMenu');
          const t = document.getElementById('settingsToggle');
          if (m && t) {
            if (!m.contains(ev.target) && ev.target !== t) m.classList.remove('open');
          }
        });
      }
    }
  }

  window.addEventListener('hashchange', route);
  route();
})();
