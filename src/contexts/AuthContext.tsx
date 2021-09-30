import Router from 'next/router';
import { destroyCookie, parseCookies, setCookie } from 'nookies';
import { createContext, ReactNode, useEffect, useState } from 'react';
import { api } from '../services/apiClient';

type User = {
  email: string;
  permissions: string[];
  roles: string[];
};

type SingInCredentials = {
  email: string;
  password: string;
};

type AuthContextData = {
  signIn: (credentials: SingInCredentials) => Promise<void>;
  signOut: () => void;
  user: User;
  isAuthenticated: boolean;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext({} as AuthContextData);

let authChannel: BroadcastChannel;

export function signOut() {
  destroyCookie(undefined, 'nextauth.token');
  destroyCookie(undefined, 'nextauth.refreshToken');

  authChannel.postMessage('signOut');

  Router.push('/');
}

export function AuthProvider({ children }: AuthProviderProps) {
  // const router = useRouter();

  const [user, setUser] = useState<User>(null);

  // !! => transforma o valor em boolean, ou seja, se existir algum valor dentro da variável, então o valor é true, se não, é false
  const isAuthenticated = !!user;

  useEffect(() => {
    authChannel = new BroadcastChannel('auth');

    authChannel.onmessage = (message) => {
      // console.log(message);

      switch (message.data) {
        case 'signOut':
          signOut();
          authChannel.close();
          break;

        case 'signIn':
          window.location.replace('http://localhost:3000/dashboard');
          break;

        default:
          break;
      }
    };
  }, []);

  useEffect(() => {
    const { 'nextauth.token': token } = parseCookies();

    if (token) {
      api
        .get('/me')
        .then((response) => {
          // console.log(response);
          const { email, permissions, roles } = response.data;

          setUser({ email, permissions, roles });
        })
        .catch((error) => {
          // console.log(error);
          signOut();
        });
    }
  }, []);

  async function signIn({ email, password }: SingInCredentials) {
    try {
      const response = await api.post('sessions', {
        email,
        password,
      });

      const { token, refreshToken, permissions, roles } = response.data;
      // console.log(response.data);

      // sessionStorage -> não fica disponível em outra sessão, por ex.: se o usuário fecha a janela, a sessão é perdida. Logo, perdemos a autenticação do usuário, ou seja, o usuário precisa fazer o login novamente.

      // localStorage -> o usuário pode fechar o browser/reiniciar o pc e o usuário continua logado no app. O servidor (server-side) não tem acesso ao localStorage, isto é, o localStorage só existe no browser (client-side).

      // cookies -> armazena info do browser, acessado tanto pelo client-side tanto pelo server-side. VAMOS USAR ESTA OPÇÃO PARA ARMAZENAR O TOKEN E O REFRESH TOKEN DO USER!!

      setCookie(undefined, 'nextauth.token', token, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });

      setCookie(undefined, 'nextauth.refreshToken', refreshToken, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });

      setUser({
        email,
        permissions,
        roles,
      });

      api.defaults.headers['Authorization'] = `Bearer ${token}`;

      Router.push('/dashboard');

      authChannel.postMessage('signIn');
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <AuthContext.Provider value={{ signIn, signOut, isAuthenticated, user }}>
      {children}
    </AuthContext.Provider>
  );
}
