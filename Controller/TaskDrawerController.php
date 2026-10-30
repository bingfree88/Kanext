<?php

namespace Kanboard\Plugin\Kanext\Controller;

use Kanboard\Controller\BaseController;
use Kanboard\Model\UserMetadataModel;

/**
 * Task Drawer Controller
 *
 * Renders the task details as an HTML fragment for the Kanext side drawer.
 * Project access is enforced globally by ProjectAuthorizationMiddleware, which
 * resolves the project from the task_id parameter for plugin controllers too.
 *
 * @package  Kanboard\Plugin\Kanext\Controller
 */
class TaskDrawerController extends BaseController
{
    /**
     * Show task details (Ajax returns the task layout with the sidebar for
     * the drawer, direct access renders the full task page)
     *
     * @access public
     */
    public function show()
    {
        $task = $this->getTask();
        $commentSortingDirection = $this->userMetadataCacheDecorator->get(UserMetadataModel::KEY_COMMENT_SORTING_DIRECTION, 'ASC');

        $params = array(
            'task' => $task,
            'project' => $this->projectModel->getById($task['project_id']),
            'files' => $this->taskFileModel->getAllDocuments($task['id']),
            'images' => $this->taskFileModel->getAllImages($task['id']),
            'comments' => $this->commentModel->getAll($task['id'], $commentSortingDirection),
            'subtasks' => $this->subtaskModel->getAll($task['id']),
            'internal_links' => $this->taskLinkModel->getAllGroupedByLabel($task['id']),
            'external_links' => $this->taskExternalLinkModel->getAll($task['id']),
            'link_label_list' => $this->linkModel->getList(0, false),
            'tags' => $this->taskTagModel->getTagsByTask($task['id']),
        );

        if ($this->request->isAjax()) {
            // LayoutHelper::subLayout returns the bare content for Ajax requests
            // and would drop the task sidebar, so render the layout parts here
            $params['is_ajax'] = true;
            $params['content_for_sublayout'] = $this->template->render('task/show', $params);
            $params['sidebar_template'] = 'task/sidebar';

            $this->response->html($this->template->render('task/layout', $params));
        } else {
            $this->response->html($this->helper->layout->task('task/show', $params));
        }
    }
}
