import { useAuth } from '../../context/AuthContext';

function HomePage() {
  console.log("hi");

  const { logout } = useAuth();
  logout();

  return (
    <>
    </>
  );
}

export default HomePage;