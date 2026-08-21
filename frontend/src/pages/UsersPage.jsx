import { useEffect, useMemo, useState } from 'react'
import { fetchUsers, deleteUser, createUser, updateUser } from '../services/userService'
import { useLanguage } from '../contexts/LanguageContext'
import UserFormModal from './UserFormModal'
import '../styles/modal.css'

function UsersPage() {
  const { t } = useLanguage()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [filters, setFilters] = useState({ role: '' })
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchUsers()
      .then((data) => {
        setUsers(data)
        setError(null)
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = search
        ? [user.username, user.first_name, user.last_name, user.email]
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase())
        : true
      const matchesRole = filters.role ? user.role_title === filters.role : true
      return matchesSearch && matchesRole
    })
  }, [users, search, filters])

  const fixedRoles = [
    t('users.role_supervisor'),
    t('users.role_maintenance_manager'),
    t('users.role_technician'),
  ]
  const totalActive = users.filter((user) => user.is_active).length

  const openCreate = () => {
    setEditingUser(null)
    setModalOpen(true)
  }

  const openEdit = (user) => {
    setEditingUser(user)
    setModalOpen(true)
  }

  const handleSubmit = (payload) => {
    const normalizedPayload = {
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      is_active: payload.is_active,
      profile: {
        role_title: payload.role_title,
      },
    }

    const action = editingUser
      ? updateUser(editingUser.id, normalizedPayload)
      : createUser(normalizedPayload)

    action
      .then(() => fetchUsers())
      .then((data) => {
        setUsers(data)
        setModalOpen(false)
        setEditingUser(null)
      })
      .catch((err) => {
        setError(err.message)
      })
  }

  const handleDelete = (user) => {
    if (!window.confirm(t('users.confirm_delete'))) {
      return
    }
    deleteUser(user.id)
      .then(() => fetchUsers())
      .then((data) => setUsers(data))
      .catch((err) => setError(err.message))
  }

  return (
    <div className="admin-page">
      <div className="page-heading-row">
        <div>
          <h1>{t('pages.users_title')}</h1>
        </div>
        <button className="primary-button" onClick={openCreate}>
          {t('users.new_user')}
        </button>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-card">
          <p className="card-label">{t('users.total_users')}</p>
          <h2>{users.length}</h2>
          <p className="card-meta">{t('users.total_users_subtitle')}</p>
        </div>
        <div className="admin-card">
          <p className="card-label">{t('users.active_users')}</p>
          <h2>{totalActive}</h2>
          <p className="card-meta">{t('users.active_users_subtitle')}</p>
        </div>
        <div className="admin-card">
          <p className="card-label">{t('users.roles_defined')}</p>
          <h2>{fixedRoles.length}</h2>
          <p className="card-meta">{t('users.roles_defined_subtitle')}</p>
        </div>
      </div>

      <div className="table-panel">
        <div className="table-toolbar">
          <input
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('users.search_placeholder')}
          />
          <div className="filter-row">
            <select value={filters.role} onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}>
              <option value="">{t('users.all_roles')}</option>
              {fixedRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="form-error" style={{ color: '#b91c1c' }}>{error}</div>}
        {loading ? (
          <div>{t('users.loading')}</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                  <tr>
                  <th>{t('users.employee_id')}</th>
                  <th>{t('users.full_name')}</th>
                  <th>{t('users.email')}</th>
                  <th>{t('users.role')}</th>
                  <th>{t('users.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.first_name} {user.last_name}</td>
                    <td>{user.email}</td>
                    <td>{user.role_title || '—'}</td>
                    <td>
                      <button className="icon-button" onClick={() => openEdit(user)}>
                        ✎
                      </button>
                      <button className="icon-button" style={{ marginLeft: 8 }} onClick={() => handleDelete(user)}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserFormModal
        open={modalOpen}
        initialData={editingUser}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        roles={fixedRoles}
      />
    </div>
  )
}

export default UsersPage
