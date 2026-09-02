/*
 * Fluid hero background — orange liquid simulation behind the Hero section.
 * Vanilla WebGL adaptation of Pavel Dobryakov's WebGL Fluid Simulation (MIT),
 * trimmed to the core solver (advection / vorticity / pressure) + shaded display.
 * Idle = transparent (dark hero shows through); pointer movement paints orange.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("fluid-hero");
  var hero = canvas && canvas.closest(".hero");
  if (!canvas || !hero) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) { canvas.remove(); return; }

  var isSmall = window.matchMedia("(max-width: 768px)").matches;

  var config = {
    SIM_RESOLUTION: isSmall ? 96 : 128,
    DYE_RESOLUTION: isSmall ? 512 : 1024,
    DENSITY_DISSIPATION: 3.2,
    VELOCITY_DISSIPATION: 2.4,
    PRESSURE: 0.8,
    PRESSURE_ITERATIONS: 20,
    CURL: 14,
    SPLAT_RADIUS: 0.22,
    SPLAT_FORCE: 6000,
    SHADING: true
  };

  var gl, ext;
  var params = {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false
  };
  gl = canvas.getContext("webgl2", params);
  var isWebGL2 = !!gl;
  if (!isWebGL2) gl = canvas.getContext("webgl", params) || canvas.getContext("experimental-webgl", params);
  if (!gl) { canvas.remove(); return; }

  var halfFloat, supportLinearFiltering;
  if (isWebGL2) {
    gl.getExtension("EXT_color_buffer_float");
    supportLinearFiltering = gl.getExtension("OES_texture_float_linear");
  } else {
    halfFloat = gl.getExtension("OES_texture_half_float");
    supportLinearFiltering = gl.getExtension("OES_texture_half_float_linear");
  }
  gl.clearColor(0.0, 0.0, 0.0, 0.0);

  var halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : (halfFloat && halfFloat.HALF_FLOAT_OES);
  var formatRGBA, formatRG, formatR;
  if (isWebGL2) {
    formatRGBA = getSupportedFormat(gl.RGBA16F, gl.RGBA, halfFloatTexType);
    formatRG = getSupportedFormat(gl.RG16F, gl.RG, halfFloatTexType);
    formatR = getSupportedFormat(gl.R16F, gl.RED, halfFloatTexType);
  } else {
    formatRGBA = getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType);
    formatRG = getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType);
    formatR = getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType);
  }
  if (!formatRGBA) { canvas.remove(); return; }

  function getSupportedFormat(internalFormat, format, type) {
    if (!supportRenderTextureFormat(internalFormat, format, type)) {
      if (isWebGL2) {
        switch (internalFormat) {
          case gl.R16F: return getSupportedFormat(gl.RG16F, gl.RG, type);
          case gl.RG16F: return getSupportedFormat(gl.RGBA16F, gl.RGBA, type);
        }
      }
      return null;
    }
    return { internalFormat: internalFormat, format: format };
  }
  function supportRenderTextureFormat(internalFormat, format, type) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(fbo);
    return status === gl.FRAMEBUFFER_COMPLETE;
  }

  /* ---------- shader plumbing ---------- */
  function compileShader(type, source, keywords) {
    source = addKeywords(source, keywords);
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(shader));
    return shader;
  }
  function addKeywords(source, keywords) {
    if (!keywords) return source;
    var prefix = "";
    keywords.forEach(function (k) { prefix += "#define " + k + "\n"; });
    return prefix + source;
  }
  function createProgram(vs, fs) {
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) console.warn(gl.getProgramInfoLog(program));
    return program;
  }
  function getUniforms(program) {
    var uniforms = {};
    var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < count; i++) {
      var name = gl.getActiveUniform(program, i).name;
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    return uniforms;
  }
  function Program(vs, fs) {
    this.uniforms = {};
    this.program = createProgram(vs, fs);
    this.uniforms = getUniforms(this.program);
  }
  Program.prototype.bind = function () { gl.useProgram(this.program); };

  var baseVertexShader = compileShader(gl.VERTEX_SHADER,
    "precision highp float;attribute vec2 aPosition;varying vec2 vUv,vL,vR,vT,vB;uniform vec2 texelSize;" +
    "void main(){vUv=aPosition*0.5+0.5;vL=vUv-vec2(texelSize.x,0.0);vR=vUv+vec2(texelSize.x,0.0);" +
    "vT=vUv+vec2(0.0,texelSize.y);vB=vUv-vec2(0.0,texelSize.y);gl_Position=vec4(aPosition,0.0,1.0);}");

  var copyShader = compileShader(gl.FRAGMENT_SHADER,
    "precision mediump float;varying vec2 vUv;uniform sampler2D uTexture;" +
    "void main(){gl_FragColor=texture2D(uTexture,vUv);}");

  var clearShader = compileShader(gl.FRAGMENT_SHADER,
    "precision mediump float;varying vec2 vUv;uniform sampler2D uTexture;uniform float value;" +
    "void main(){gl_FragColor=value*texture2D(uTexture,vUv);}");

  var displayShaderSource =
    "precision highp float;\nvarying vec2 vUv,vL,vR,vT,vB;\nuniform sampler2D uTexture;\nuniform vec2 texelSize;\n" +
    "void main(){\nvec3 c=texture2D(uTexture,vUv).rgb;\n" +
    "#ifdef SHADING\n" +
    "vec3 lc=texture2D(uTexture,vL).rgb;vec3 rc=texture2D(uTexture,vR).rgb;" +
    "vec3 tc=texture2D(uTexture,vT).rgb;vec3 bc=texture2D(uTexture,vB).rgb;" +
    "float dx=length(rc)-length(lc);float dy=length(tc)-length(bc);" +
    "vec3 n=normalize(vec3(dx,dy,length(texelSize)));" +
    "float diffuse=clamp(dot(n,vec3(0.0,0.0,1.0))+0.7,0.7,1.0);c*=diffuse;\n" +
    "#endif\n" +
    "float a=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c,a);}";

  var splatShader = compileShader(gl.FRAGMENT_SHADER,
    "precision highp float;varying vec2 vUv;uniform sampler2D uTarget;uniform float aspectRatio;" +
    "uniform vec3 color;uniform vec2 point;uniform float radius;" +
    "void main(){vec2 p=vUv-point.xy;p.x*=aspectRatio;vec3 splat=exp(-dot(p,p)/radius)*color;" +
    "vec3 base=texture2D(uTarget,vUv).xyz;gl_FragColor=vec4(base+splat,1.0);}");

  var advectionShader = compileShader(gl.FRAGMENT_SHADER,
    "precision highp float;varying vec2 vUv;uniform sampler2D uVelocity;uniform sampler2D uSource;" +
    "uniform vec2 texelSize;uniform vec2 dyeTexelSize;uniform float dt;uniform float dissipation;" +
    "vec4 bilerp(sampler2D sam,vec2 uv,vec2 tsize){vec2 st=uv/tsize-0.5;vec2 iuv=floor(st);vec2 fuv=fract(st);" +
    "vec4 a=texture2D(sam,(iuv+vec2(0.5,0.5))*tsize);vec4 b=texture2D(sam,(iuv+vec2(1.5,0.5))*tsize);" +
    "vec4 c=texture2D(sam,(iuv+vec2(0.5,1.5))*tsize);vec4 d=texture2D(sam,(iuv+vec2(1.5,1.5))*tsize);" +
    "return mix(mix(a,b,fuv.x),mix(c,d,fuv.x),fuv.y);}" +
    "void main(){vec2 coord=vUv-dt*bilerp(uVelocity,vUv,texelSize).xy*texelSize;" +
    "gl_FragColor=bilerp(uSource,coord,dyeTexelSize)/(1.0+dissipation*dt);}");

  var divergenceShader = compileShader(gl.FRAGMENT_SHADER,
    "precision mediump float;varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity;" +
    "void main(){float L=texture2D(uVelocity,vL).x;float R=texture2D(uVelocity,vR).x;" +
    "float T=texture2D(uVelocity,vT).y;float B=texture2D(uVelocity,vB).y;vec2 C=texture2D(uVelocity,vUv).xy;" +
    "if(vL.x<0.0)L=-C.x;if(vR.x>1.0)R=-C.x;if(vT.y>1.0)T=-C.y;if(vB.y<0.0)B=-C.y;" +
    "gl_FragColor=vec4(0.5*(R-L+T-B),0.0,0.0,1.0);}");

  var curlShader = compileShader(gl.FRAGMENT_SHADER,
    "precision mediump float;varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity;" +
    "void main(){float L=texture2D(uVelocity,vL).y;float R=texture2D(uVelocity,vR).y;" +
    "float T=texture2D(uVelocity,vT).x;float B=texture2D(uVelocity,vB).x;" +
    "gl_FragColor=vec4(0.5*(R-L-T+B),0.0,0.0,1.0);}");

  var vorticityShader = compileShader(gl.FRAGMENT_SHADER,
    "precision highp float;varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity;uniform sampler2D uCurl;" +
    "uniform float curl;uniform float dt;" +
    "void main(){float L=texture2D(uCurl,vL).x;float R=texture2D(uCurl,vR).x;float T=texture2D(uCurl,vT).x;" +
    "float B=texture2D(uCurl,vB).x;float C=texture2D(uCurl,vUv).x;" +
    "vec2 force=0.5*vec2(abs(T)-abs(B),abs(R)-abs(L));force/=length(force)+0.0001;force*=curl*C;force.y*=-1.0;" +
    "vec2 velocity=texture2D(uVelocity,vUv).xy+force*dt;velocity=clamp(velocity,-1000.0,1000.0);" +
    "gl_FragColor=vec4(velocity,0.0,1.0);}");

  var pressureShader = compileShader(gl.FRAGMENT_SHADER,
    "precision mediump float;varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uPressure;uniform sampler2D uDivergence;" +
    "void main(){float L=texture2D(uPressure,vL).x;float R=texture2D(uPressure,vR).x;float T=texture2D(uPressure,vT).x;" +
    "float B=texture2D(uPressure,vB).x;float divergence=texture2D(uDivergence,vUv).x;" +
    "gl_FragColor=vec4((L+R+B+T-divergence)*0.25,0.0,0.0,1.0);}");

  var gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER,
    "precision mediump float;varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uPressure;uniform sampler2D uVelocity;" +
    "void main(){float L=texture2D(uPressure,vL).x;float R=texture2D(uPressure,vR).x;float T=texture2D(uPressure,vT).x;" +
    "float B=texture2D(uPressure,vB).x;vec2 velocity=texture2D(uVelocity,vUv).xy-vec2(R-L,T-B);" +
    "gl_FragColor=vec4(velocity,0.0,1.0);}");

  var copyProgram = new Program(baseVertexShader, copyShader);
  var clearProgram = new Program(baseVertexShader, clearShader);
  var splatProgram = new Program(baseVertexShader, splatShader);
  var advectionProgram = new Program(baseVertexShader, advectionShader);
  var divergenceProgram = new Program(baseVertexShader, divergenceShader);
  var curlProgram = new Program(baseVertexShader, curlShader);
  var vorticityProgram = new Program(baseVertexShader, vorticityShader);
  var pressureProgram = new Program(baseVertexShader, pressureShader);
  var gradienSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);
  var displayProgram = new Program(baseVertexShader,
    compileShader(gl.FRAGMENT_SHADER, displayShaderSource, config.SHADING ? ["SHADING"] : null));

  /* ---------- fullscreen quad ---------- */
  var blit = (function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    return function (target, clear) {
      if (!target) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      }
      if (clear) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
  })();

  /* ---------- framebuffers ---------- */
  var dye, velocity, divergence, curl, pressure;

  function createFBO(w, h, internalFormat, format, type, filter) {
    gl.activeTexture(gl.TEXTURE0);
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    var texelSizeX = 1.0 / w, texelSizeY = 1.0 / h;
    return {
      texture: texture, fbo: fbo, width: w, height: h,
      texelSizeX: texelSizeX, texelSizeY: texelSizeY,
      attach: function (id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; }
    };
  }
  function createDoubleFBO(w, h, internalFormat, format, type, filter) {
    var fbo1 = createFBO(w, h, internalFormat, format, type, filter);
    var fbo2 = createFBO(w, h, internalFormat, format, type, filter);
    return {
      width: w, height: h, texelSizeX: fbo1.texelSizeX, texelSizeY: fbo1.texelSizeY,
      get read() { return fbo1; }, set read(v) { fbo1 = v; },
      get write() { return fbo2; }, set write(v) { fbo2 = v; },
      swap: function () { var t = fbo1; fbo1 = fbo2; fbo2 = t; }
    };
  }
  function resizeFBO(target, w, h, internalFormat, format, type, filter) {
    var newFBO = createFBO(w, h, internalFormat, format, type, filter);
    copyProgram.bind();
    gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
    blit(newFBO);
    return newFBO;
  }
  function resizeDoubleFBO(target, w, h, internalFormat, format, type, filter) {
    if (target.width === w && target.height === h) return target;
    target.read = resizeFBO(target.read, w, h, internalFormat, format, type, filter);
    target.write = createFBO(w, h, internalFormat, format, type, filter);
    target.width = w; target.height = h;
    target.texelSizeX = 1.0 / w; target.texelSizeY = 1.0 / h;
    return target;
  }

  function getResolution(resolution) {
    var aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;
    var min = Math.round(resolution);
    var max = Math.round(resolution * aspectRatio);
    if (gl.drawingBufferWidth > gl.drawingBufferHeight) return { width: max, height: min };
    return { width: min, height: max };
  }

  function initFramebuffers() {
    var simRes = getResolution(config.SIM_RESOLUTION);
    var dyeRes = getResolution(config.DYE_RESOLUTION);
    var texType = halfFloatTexType;
    var rgba = formatRGBA, rg = formatRG, r = formatR;
    var filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
    gl.disable(gl.BLEND);

    dye = dye
      ? resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering)
      : createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    velocity = velocity
      ? resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering)
      : createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);

    divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
  }

  /* ---------- simulation step ---------- */
  var lastTime = Date.now();
  function calcDeltaTime() {
    var now = Date.now();
    var dt = (now - lastTime) / 1000;
    dt = Math.min(dt, 0.016666);
    lastTime = now;
    return dt;
  }

  function step(dt) {
    gl.disable(gl.BLEND);

    curlProgram.bind();
    gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(curl);

    vorticityProgram.bind();
    gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
    gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
    gl.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity.write); velocity.swap();

    divergenceProgram.bind();
    gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence);

    clearProgram.bind();
    gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
    gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
    blit(pressure.write); pressure.swap();

    pressureProgram.bind();
    gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
    for (var i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
      blit(pressure.write); pressure.swap();
    }

    gradienSubtractProgram.bind();
    gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
    gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write); velocity.swap();

    advectionProgram.bind();
    gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    var dyeTexelX = supportLinearFiltering ? velocity.texelSizeX : dye.texelSizeX;
    var dyeTexelY = supportLinearFiltering ? velocity.texelSizeY : dye.texelSizeY;
    gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectionProgram.uniforms.uSource, velocity.read.attach(0));
    gl.uniform1f(advectionProgram.uniforms.dt, dt);
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
    blit(velocity.write); velocity.swap();

    gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
    blit(dye.write); dye.swap();
  }

  function render() {
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    displayProgram.bind();
    if (config.SHADING)
      gl.uniform2f(displayProgram.uniforms.texelSize, 1.0 / gl.drawingBufferWidth, 1.0 / gl.drawingBufferHeight);
    gl.uniform1i(displayProgram.uniforms.uTexture, dye.read.attach(0));
    blit(null);
  }

  /* ---------- splats ---------- */
  function splat(x, y, dx, dy, color) {
    splatProgram.bind();
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatProgram.uniforms.point, x, y);
    gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
    gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100.0));
    blit(velocity.write); velocity.swap();

    gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
    blit(dye.write); dye.swap();
  }
  function correctRadius(radius) {
    var aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1) radius *= aspectRatio;
    return radius;
  }

  function HSVtoRGB(h, s, v) {
    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);
    var r, g, b;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return { r: r, g: g, b: b };
  }
  // orange band of the HSV wheel (~ #FF5A00 → #FF8C00), scaled down for the solver
  function orangeColor(scale) {
    var c = HSVtoRGB(0.028 + Math.random() * 0.055, 1.0, 1.0);
    var k = scale == null ? 0.16 : scale;
    return { r: c.r * k, g: c.g * k, b: c.b * k };
  }

  function splatAt(px, py, dx, dy, scale) {
    var rect = canvas.getBoundingClientRect();
    var x = (px - rect.left) / rect.width;
    var y = 1.0 - (py - rect.top) / rect.height;
    splat(x, y, dx, dy, orangeColor(scale));
  }
  function multipleSplats(amount) {
    for (var i = 0; i < amount; i++) {
      var color = orangeColor(0.18);
      var x = Math.random(), y = Math.random();
      var dx = 1000 * (Math.random() - 0.5);
      var dy = 1000 * (Math.random() - 0.5);
      splat(x, y, dx, dy, color);
    }
  }

  /* ---------- pointer ---------- */
  var pointer = { x: 0, y: 0, hasPrev: false };
  function onMove(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    if (pointer.hasPrev) {
      var dx = (clientX - pointer.x) * config.SPLAT_FORCE * 0.7 / rect.width;
      var dy = -(clientY - pointer.y) * config.SPLAT_FORCE * 0.7 / rect.height;
      if (dx * dx + dy * dy > 4) splatAt(clientX, clientY, dx, dy, 0.16);
    }
    pointer.x = clientX; pointer.y = clientY; pointer.hasPrev = true;
  }
  hero.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    onMove(e.clientX, e.clientY);
  }, { passive: true });
  hero.addEventListener("pointerdown", function (e) {
    pointer.hasPrev = false;
    splatAt(e.clientX, e.clientY, (Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000, 0.22);
  });
  hero.addEventListener("pointerleave", function () { pointer.hasPrev = false; });
  hero.addEventListener("touchmove", function (e) {
    var t = e.targetTouches[0];
    if (!t) return;
    var rect = canvas.getBoundingClientRect();
    var dx = pointer.hasPrev ? (t.clientX - pointer.x) * 40 : (Math.random() - 0.5) * 400;
    var dy = pointer.hasPrev ? -(t.clientY - pointer.y) * 40 : (Math.random() - 0.5) * 400;
    splatAt(t.clientX, t.clientY, dx, dy, 0.16);
    pointer.x = t.clientX; pointer.y = t.clientY; pointer.hasPrev = true;
  }, { passive: true });

  /* ---------- ambient drift ---------- */
  var ambientTimer = setInterval(function () {
    if (document.hidden || !visible) return;
    var x = Math.random(), y = 0.25 + Math.random() * 0.6;
    splat(x, y, (Math.random() - 0.5) * 1400, (Math.random() - 0.5) * 900, orangeColor(0.12));
  }, 5200);

  /* ---------- resize + visibility ---------- */
  function resizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(hero.clientWidth * dpr);
    var h = Math.round(hero.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      return true;
    }
    return false;
  }

  var visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { threshold: 0.01 }).observe(hero);
  }
  window.addEventListener("resize", function () {
    if (resizeCanvas()) initFramebuffers();
  });

  /* ---------- boot ---------- */
  resizeCanvas();
  initFramebuffers();
  multipleSplats(Math.floor(Math.random() * 4) + 4);

  function frame() {
    var dt = calcDeltaTime();
    if (resizeCanvas()) initFramebuffers();
    if (visible && !document.hidden) {
      step(dt);
      render();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
