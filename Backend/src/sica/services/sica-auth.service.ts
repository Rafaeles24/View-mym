import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import axios, {
  AxiosInstance,
} from 'axios';

import {
  CookieJar,
} from 'tough-cookie';

import {
  HttpCookieAgent,
  HttpsCookieAgent,
} from 'http-cookie-agent/http';


@Injectable()
export class SicaAuthService {

  private readonly logger =
    new Logger(SicaAuthService.name);

  private readonly baseUrl =
    'https://sicacentercrm.com';

  private readonly client: AxiosInstance;

  private readonly jar: CookieJar;


  constructor() {

    this.jar =
      new CookieJar();

    this.client =
      axios.create({

        baseURL:
          this.baseUrl,

        httpAgent:
          new HttpCookieAgent({
            cookies: {
              jar: this.jar,
            },
          }),

        httpsAgent:
          new HttpsCookieAgent({
            cookies: {
              jar: this.jar,
            },
          }),

        timeout:
          120000,

        headers: {

          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/151.0.0.0 Safari/537.36',

          'Accept-Language':
            'es-ES,es;q=0.9',
        },
      });
  }


  getClient(): AxiosInstance {
    return this.client;
  }


  // ============================================================
  // ASEGURAR SESIÓN
  // ============================================================

  async asegurarSesion(): Promise<void> {

    this.logger.log(
      'Verificando sesión de SICA Center...',
    );

    const activa =
      await this.verificarSesion();

    if (activa) {

      this.logger.log(
        'La sesión SICA ya está activa.',
      );

      return;
    }

    this.logger.log(
      'No existe una sesión activa. Iniciando login...',
    );

    await this.login();

    const validada =
      await this.verificarSesion();

    if (!validada) {

      throw new UnauthorizedException(
        'No se pudo iniciar sesión en SICA Center',
      );
    }

    this.logger.log(
      'Sesión SICA iniciada correctamente.',
    );
  }


  // ============================================================
  // VERIFICAR SESIÓN
  // ============================================================

  async verificarSesion(): Promise<boolean> {
    const origen = new URL(this.baseUrl).origin;
    const maxRedirecciones = 5;
    const estadosRedireccion = [301, 302, 303, 307, 308];
    
    let url = new URL('/system', this.baseUrl);
    const visitadas = new Set<string>();
    
    try {
      for (let salto = 0; salto <= maxRedirecciones; salto++) {
        // Seguir únicamente destinos del mismo sitio.
        if (url.origin !== origen) {
          this.logger.warn(
            'Verificación SICA: redirección a otro origen.',
          );
          return false;
        }
      
        if (/\/account\/login(?:\/|$)/i.test(url.pathname)) {
          this.logger.debug(
            'Verificación SICA: redirección al login.',
          );
          return false;
        }
      
        if (visitadas.has(url.href)) {
          this.logger.warn(
            'Verificación SICA: ciclo de redirecciones.',
          );
          return false;
        }
      
        visitadas.add(url.href);
      
        // El mismo cliente utiliza el CookieJar existente.
        const response = await this.client.get<string>(url.href, {
          maxRedirects: 0,
          responseType: 'text',
          validateStatus: (status) =>
            status >= 200 && status < 400,
        });
      
        this.logger.debug(
          `Verificación SICA: ${url.pathname} → HTTP ${response.status}`,
        );
      
        if (response.status === 200) {
          const contenido =
            typeof response.data === 'string'
              ? response.data
              : '';
        
          // Detectar un formulario de login servido con HTTP 200.
          // Es una comprobación heurística del HTML.
          const formularioLogin =
            /<form\b[^>]*\baction\s*=\s*["'][^"']*\/account\/login\b/i
              .test(contenido);
        
          const campoUsuario =
            /<input\b[^>]*\bname\s*=\s*["']username["']/i
              .test(contenido);
        
          const campoPassword =
            /<input\b[^>]*\btype\s*=\s*["']password["']/i
              .test(contenido);
        
          if (
            formularioLogin ||
            (campoUsuario && campoPassword)
          ) {
            this.logger.debug(
              'Verificación SICA: HTML del formulario de login.',
            );
            return false;
          }
        
          return contenido.trim().length > 0;
        }
      
        if (!estadosRedireccion.includes(response.status)) {
          return false;
        }
      
        const location = response.headers.location;
      
        if (typeof location !== 'string' || !location) {
          this.logger.warn(
            'Verificación SICA: redirección sin Location.',
          );
          return false;
        }
      
        // Resuelve tanto rutas relativas como URLs absolutas.
        url = new URL(location, url);
      }
    
      this.logger.warn(
        'Verificación SICA: se superó el límite de redirecciones.',
      );
    
      return false;
    } catch (error: unknown) {
      const detalle = axios.isAxiosError(error)
        ? `HTTP ${error.response?.status ?? 'sin respuesta'}; código ${
            error.code ?? 'desconocido'
          }`
        : 'Error procesando la verificación';
        
      this.logger.error(
        `Error verificando sesión SICA: ${detalle}`,
      );
    
      return false;
    }
  }


  // ============================================================
  // LOGIN
  // ============================================================

  private async login(): Promise<void> {

    const username =
      process.env.SICA_USER;

    const password =
      process.env.SICA_PASSWORD;


    if (!username || !password) {

      throw new InternalServerErrorException(
        'Faltan SICA_USER o SICA_PASSWORD',
      );
    }


    const loginPage =
      '/system/Account/Login';

    const loginEndpoint =
      '/system/Admin/Account/Login';


    // ==========================================================
    // 1. ABRIR FORMULARIO
    // ==========================================================

    this.logger.log(
      'Abriendo formulario de login SICA...',
    );


    const responseGet =
      await this.client.get(
        loginPage,
        {

          headers: {

            Accept:
              'text/html,application/xhtml+xml,' +
              'application/xml;q=0.9,*/*;q=0.8',
          },

          maxRedirects: 5,
        },
      );


    this.logger.debug(
      `GET login: HTTP ${responseGet.status}`,
    );


    // ==========================================================
    // VER COOKIES OBTENIDAS
    // ==========================================================

    const cookiesIniciales =
      await this.jar.getCookies(
        this.baseUrl,
      );


    this.logger.debug(
      `Cookies iniciales: ${
        cookiesIniciales
          .map(
            (cookie) =>
              cookie.key,
          )
          .join(', ')
      }`,
    );


    // ==========================================================
    // 2. CREAR FORMULARIO
    // ==========================================================

    const form =
      new URLSearchParams();


    form.append(
      'Username',
      username,
    );


    form.append(
      'Password',
      password,
    );


    form.append(
      'X-Requested-With',
      'XMLHttpRequest',
    );


    // ==========================================================
    // 3. ENVIAR LOGIN
    // ==========================================================

    this.logger.log(
      'Enviando credenciales a SICA...',
    );


    const responseLogin =
      await this.client.post(
        loginEndpoint,

        form.toString(),

        {

          headers: {

            Accept:
              '*/*',

            'Content-Type':
              'application/x-www-form-urlencoded; charset=UTF-8',

            Origin:
              this.baseUrl,

            Referer:
              `${this.baseUrl}${loginPage}`,

            'X-Requested-With':
              'XMLHttpRequest',
          },

          /*
           * Queremos inspeccionar la respuesta real.
           */
          maxRedirects: 0,

          validateStatus:
            (status) =>
              status >= 200 &&
              status < 400,
        },
      );


    this.logger.log(
      `Login SICA respondió HTTP ${responseLogin.status}`,
    );


    // ==========================================================
    // 4. MOSTRAR INFORMACIÓN DE RESPUESTA
    // ==========================================================

    const location =
      responseLogin.headers.location;


    if (location) {

      this.logger.debug(
        `Login Location: ${location}`,
      );
    }


    if (
      typeof responseLogin.data ===
      'string'
    ) {

      /*
       * Solo mostramos una pequeña parte.
       * NUNCA imprimimos usuario/contraseña.
       */
      this.logger.debug(
        `Respuesta login: ${
          responseLogin.data
            .substring(0, 300)
        }`,
      );
    }

    else {

      this.logger.debug(
        `Respuesta login: ${JSON.stringify(
          responseLogin.data,
        ).substring(
          0,
          300,
        )}`,
      );
    }


    // ==========================================================
    // 5. VERIFICAR COOKIES DESPUÉS DEL LOGIN
    // ==========================================================

    const cookiesLogin =
      await this.jar.getCookies(
        this.baseUrl,
      );


    this.logger.debug(
      `Cookies después del login: ${
        cookiesLogin
          .map(
            (cookie) =>
              cookie.key,
          )
          .join(', ')
      }`,
    );
  }
}