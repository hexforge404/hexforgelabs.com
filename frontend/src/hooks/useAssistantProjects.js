// frontend/src/hooks/useAssistantProjects.js
import { useCallback, useEffect, useState } from "react";

const API_BASE = "/api/assistant/projects";


export function useAssistantProjects() {
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(null);

  const [selectedProject, setSelectedProject] = useState(null);
  const [projectSessions, setProjectSessions] = useState([]);
  const [projectSessionsLoading, setProjectSessionsLoading] = useState(false);
  const [projectSessionsError, setProjectSessionsError] = useState(null);

  const clearProjectsError = useCallback(() => {
    setProjectsError(null);
    setProjectSessionsError(null);
  }, []);

  // ---- LOAD PROJECT LIST ----
  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const res = await fetch(API_BASE, { method: "GET" });

      if (res.status === 404) {
        setProjectsError("Endpoint not found");
        setProjects([]);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load projects (${res.status})`);
      }

      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("loadProjects error:", err);
      setProjectsError(err.message || "Failed to load projects");
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  // ---- CREATE PROJECT ----
  const createProject = useCallback(async (name) => {
    setProjectsError(null);
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.status === 404) {
        throw new Error("Endpoint not found");
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to create project (${res.status})`);
      }

      const created = await res.json();
      // refresh list
      await loadProjects();
      return created;
    } catch (err) {
      console.error("createProject error:", err);
      setProjectsError(err.message || "Failed to create project");
      return null;
    }
  }, [loadProjects]);

  // ---- RENAME PROJECT ----
  const renameProject = useCallback(
    async (projectId, name) => {
      setProjectsError(null);
      try {
        const res = await fetch(`${API_BASE}/${encodeURIComponent(projectId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });

        if (res.status === 404) {
          throw new Error("Endpoint not found");
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error || `Failed to rename project (${res.status})`
          );
        }

        await loadProjects();
      } catch (err) {
        console.error("renameProject error:", err);
        setProjectsError(err.message || "Failed to rename project");
      }
    },
    [loadProjects]
  );

  // ---- DELETE PROJECT ----
  const deleteProject = useCallback(
    async (projectId) => {
      setProjectsError(null);
      try {
        const res = await fetch(`${API_BASE}/${encodeURIComponent(projectId)}`, {
          method: "DELETE",
        });

        if (res.status === 404) {
          throw new Error("Endpoint not found");
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error || `Failed to delete project (${res.status})`
          );
        }

        await loadProjects();
      } catch (err) {
        console.error("deleteProject error:", err);
        setProjectsError(err.message || "Failed to delete project");
      }
    },
    [loadProjects]
  );

  // ---- LOAD SESSIONS FOR ONE PROJECT ----
  const loadProjectSessions = useCallback(async (projectId) => {
    if (!projectId) {
      setProjectSessions([]);
      return;
    }
    setProjectSessionsLoading(true);
    setProjectSessionsError(null);
    try {
      const res = await fetch(
        `${API_BASE}/${encodeURIComponent(projectId)}/sessions`,
        { method: "GET" }
      );

      if (res.status === 404) {
        setProjectSessionsError("Endpoint not found");
        setProjectSessions([]);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to load project sessions (${res.status})`
        );
      }

      const data = await res.json();
      setProjectSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("loadProjectSessions error:", err);
      setProjectSessionsError(
        err.message || "Failed to load project sessions"
      );
    } finally {
      setProjectSessionsLoading(false);
    }
  }, []);

  // ---- SELECT PROJECT ----
  const selectProject = useCallback(
    async (project) => {
      setSelectedProject(project);
      setProjectSessions([]);
      setProjectSessionsError(null);

      if (project && (project._id || project.id || project.slug)) {
        const id = project._id || project.id || project.slug;
        await loadProjectSessions(id);
      }
    },
    [loadProjectSessions]
  );

  // initial load
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    projects,
    projectsLoading,
    projectsError,
    selectedProject,
    projectSessions,
    projectSessionsLoading,
    projectSessionsError,
    loadProjects,
    createProject,
    renameProject,
    deleteProject,
    selectProject,
    clearProjectsError,
  };
}
