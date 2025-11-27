// frontend/src/hooks/useAssistantProjects.js
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_URL } from "../config";

const apiBase = API_URL.replace(/\/$/, "");

export function useAssistantProjects() {
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");

  const [selectedProject, setSelectedProject] = useState(null);
  const [projectSessions, setProjectSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");

  // Load all projects
  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError("");
    try {
      const res = await axios.get(`${apiBase}/assistant-projects`);
      setProjects(res.data || []);
    } catch (err) {
      console.error("[projects] load error", err);
      setProjectsError("Failed to load projects.");
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  // Call once on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // When user picks a project, load its sessions
  const selectProject = useCallback(async (project) => {
    if (!project) {
      setSelectedProject(null);
      setProjectSessions([]);
      return;
    }

    setSelectedProject(project);
    setSessionsLoading(true);
    setSessionsError("");

    try {
      const idOrSlug = project.slug || project._id;
      const res = await axios.get(
        `${apiBase}/assistant-projects/${idOrSlug}/sessions`
      );

      const payload = res.data || {};
      const sessions = payload.sessions || [];

      setProjectSessions(sessions);
    } catch (err) {
      console.error("[projects] sessions load error", err);
      setSessionsError("Failed to load project sessions.");
      setProjectSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  return {
    // projects
    projects,
    projectsLoading,
    projectsError,

    // selection
    selectedProject,
    projectSessions,
    sessionsLoading,
    sessionsError,

    // actions
    loadProjects,
    selectProject,
  };
}
