import axios, { AxiosError } from 'axios';
import { parseCookies, setCookie } from 'nookies';
import { signOut } from '../contexts/AuthContext';
import { AuthTokenError } from '../errors/AuthTokenError';

let isRefreshing = false;
let failedRequestsQueue = [];

export function setupAPIClient(ctx = undefined) {
  let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: 'http://localhost:3333',
    headers: {
      Authorization: `Bearer ${cookies['nextauth.token']}`,
    },
  });

  api.interceptors.response.use(
    (response) => {
      return response;
    },
    (error: AxiosError) => {
      // console.log(error.response.status);

      // 401 => UNAUTHORIZED ERROR
      if (error.response.status === 401) {
        if (error.response.data?.code === 'token.expired') {
          // o app deve renovar o token

          // atualizando os cookies
          cookies = parseCookies(ctx);

          // "resgatando" os cookies atualizados
          const { 'nextauth.refreshToken': refreshToken } = cookies;

          // todas a configuração da requisição do client (browser) ->  back-end (server)
          const originalConfig = error.config;

          // o app deve fazer a requisição do refreshToken uma única vez, independente da quantidade de chamadas pela api (ao mesmo) enquanto o token não está válido.

          // condicional para a 1º resposta com o token inválido.
          if (!isRefreshing) {
            isRefreshing = true;

            console.log('refresh');

            // buscando o novo refreshToken
            api
              .post('/refresh', {
                refreshToken,
              })
              .then((response) => {
                const { token } = response.data; // token = response.data.token

                // setando o novo token e o novo refreshToken
                setCookie(ctx, 'nextauth.token', token, {
                  maxAge: 60 * 60 * 24 * 30, // 30 days
                  path: '/',
                });

                setCookie(
                  ctx,
                  'nextauth.refreshToken',
                  response.data.refreshToken,
                  {
                    maxAge: 60 * 60 * 24 * 30, // 30 days
                    path: '/',
                  }
                );

                api.defaults.headers['Authorization'] = `Bearer ${token}`;

                failedRequestsQueue.forEach((request) =>
                  request.onSuccess(token)
                );
                failedRequestsQueue = [];
              })
              .catch((err) => {
                failedRequestsQueue.forEach((request) =>
                  request.onFailure(err)
                );
                failedRequestsQueue = [];

                if (process.browser) {
                  signOut();
                }
              })
              .finally(() => {
                isRefreshing = false;
              });
          }
          return new Promise((resolve, reject) => {
            failedRequestsQueue.push({
              onSuccess: (token: string) => {
                originalConfig.headers['Authorization'] = `Bearer ${token}`;

                resolve(api(originalConfig));
              },
              onFailure: (err: AxiosError) => {
                reject(err);
              },
            });
          });
        } else {
          // o app deve deslogar o user
          if (process.browser) {
            signOut();
          } else {
            return Promise.reject(new AuthTokenError());
          }
        }
      }
      return Promise.reject(error);
    }
  );

  return api;
}
