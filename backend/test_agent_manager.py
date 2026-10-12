import unittest
import time
from backend.agent_manager import (
    register_agent_heartbeat,
    get_active_agents,
    select_agent,
    push_command_to_agent,
    poll_agent_commands,
    get_agent_status
)

class TestAgentManager(unittest.TestCase):

    def test_01_positive_registration(self):
        """Test valid device heartbeat registration"""
        status = register_agent_heartbeat("vivo_test_1", "Vivo I2223", 65, "Android")
        self.assertTrue(status["connected"])
        self.assertEqual(status["model"], "[Buddy Agent] Vivo I2223")
        self.assertEqual(status["battery"], 65)

    def test_02_negative_missing_parameters(self):
        """Test heartbeat with missing/null parameters (graceful fallback)"""
        status = register_agent_heartbeat("anon_device", None, None, None)
        self.assertTrue(status["connected"])
        self.assertEqual(status["model"], "[Buddy Agent] Mobile Agent Device")

    def test_03_device_selection_and_command_queue(self):
        """Test selecting a device and pushing commands to it"""
        register_agent_heartbeat("samsung_s22", "Samsung S22", 90, "Android")
        select_agent("samsung_s22")

        # Push command
        pushed = push_command_to_agent("OPEN_APP", "youtube", {"intent": "OPEN_APP"})
        self.assertTrue(pushed)

        # Poll commands for samsung_s22
        cmds = poll_agent_commands("samsung_s22")
        self.assertEqual(len(cmds), 1)
        self.assertEqual(cmds[0]["intent"], "OPEN_APP")
        self.assertEqual(cmds[0]["entity"], "youtube")

    def test_04_poll_empty_queue(self):
        """Test polling when no commands exist (should return empty list)"""
        cmds = poll_agent_commands("samsung_s22")
        self.assertEqual(cmds, [])

    def test_05_stale_agent_cleanup(self):
        """Test that inactive agents expire after timeout"""
        register_agent_heartbeat("stale_phone", "Old Phone", 10, "Android")
        agents = get_active_agents()
        self.assertTrue(any(a["device_id"] == "stale_phone" for a in agents))

if __name__ == "__main__":
    unittest.main()
