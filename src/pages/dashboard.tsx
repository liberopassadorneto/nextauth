import { useContext, useEffect } from 'react';
import { withSSRAuth } from '../../utils/withSSRAuth';
import { Can } from '../components/Can';
import { AuthContext } from '../contexts/AuthContext';
import { setupAPIClient } from '../services/api';
import { api } from '../services/apiClient';

export default function Dashboard() {
  const { user, signOut, isAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    api
      .get('/me')
      .then((response) => console.log(response))
      .catch((error) => {
        console.log(error);
      });
  }, []);

  return (
    <>
      <h1>Dashboard</h1>
      <h2>{user?.email}</h2>
      <button onClick={signOut}>Sign Out</button>
      <Can permissions={['metrics.list']}>
        <div>Metrics</div>
      </Can>
    </>
  );
}

export const getServerSideProps = withSSRAuth(async (ctx) => {
  const apiClient = setupAPIClient(ctx);

  const response = await apiClient.get('/me');
  console.log(response.data);

  return {
    props: {},
  };
});
