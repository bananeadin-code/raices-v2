import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(usuario, password);
      nav('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al entrar');
    }
  }

  return (
    <div className="login">
      <form onSubmit={submit}>
        <h1>Raíces Duranguenses</h1>
        <input placeholder="Usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primario">Entrar</button>
      </form>
    </div>
  );
}
