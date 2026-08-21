function RolesPage() {
  const roles = [
    'Responsable maintenance',
    'Technicien',
    'Responsable exploitation',
  ]

  return (
    <div className="admin-page">
      <div className="page-heading-row">
        <div>
          <p className="breadcrumb">Administration / Roles</p>
          <h1>Roles</h1>
          <p className="page-description">
            La page des rôles permet à l’administrateur de définir les rôles
            et d’affecter chaque utilisateur au rôle approprié.
          </p>
        </div>
      </div>
      <div className="admin-card">
        <h2>Rôles disponibles</h2>
        <ul>
          {roles.map((role) => (
            <li key={role}>{role}</li>
          ))}
        </ul>
        <p>
          L’administrateur peut assigner chaque utilisateur à un rôle, puis
          chaque rôle aura sa page et ses tâches spécifiques.
        </p>
      </div>
    </div>
  )
}

export default RolesPage
