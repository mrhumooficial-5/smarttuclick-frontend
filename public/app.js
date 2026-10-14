
async function stcLoadUsers(){
  const response = await fetch(STC_API_URL + '/api/auth/users', {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('No se pudo cargar la lista de cajeros');
  }

  const data = await response.json();

  if (!Array.isArray(data.users)) {
    throw new Error('El servidor devolvió una lista inválida');
  }

  const serverUsers = data.users;

  db.users = db.users
    .filter(u => serverUsers.some(s => String(s.id) === String(u.id)))
    .map(u => {
      const serverUser = serverUsers.find(
        s => String(s.id) === String(u.id)
      );

      return {
        ...u,
        user: serverUser.user,
        role: serverUser.role,
        active: true
      };
    });

  for (const serverUser of serverUsers) {
    if (!db.users.some(u => String(u.id) === String(serverUser.id))) {
      db.users.push({
        ...serverUser,
        active: true,
        password: ''
      });
    }
  }

  return db.users;
}
