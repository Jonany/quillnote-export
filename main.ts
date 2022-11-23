import { Convert, TaskList } from "./convert.ts";

const text = await Deno.readTextFile("./backup.json");

try {
    const quillnotes = Convert.toQuillnote(text);

    console.log(quillnotes.notes.length)

    for await (const note of quillnotes.notes) {
        // Set note content
        let noteContent: string = note.content || '';

        if (note.isList) {
            const taskList = note.taskList?.map(
                    (task: TaskList) => `-[${task.isDone ? 'x' : ''}] ${task.content}`
                )
                .reduce((tasks, task) => `${tasks}\n${task}`, '');

            noteContent = taskList || '';
        }


        // Set notebook name
        let notebookName = null;

        if (note.notebookId) {
            notebookName = quillnotes.notebooks
                .filter(notebook => notebook.id === note.notebookId)[0].name;
        }


        // Set notebook name
        let noteTitle = '';

        if (note.title) {
            noteTitle = note.title.replaceAll('/', '-');
        } else {
            noteTitle = 'new-note-' + Math.floor(Math.random() * 10000);
        }

        // Set folder and file name
        const folder = notebookName ? `./notes/${notebookName}` : './notes';
        const fileName = noteTitle + '.md';

        // Create folder if needed
        await Deno.mkdir(folder, { recursive: true });

        // Create file is needed
        await Deno.writeTextFile(`${folder}/${fileName}`, noteContent);
    }
} catch (error) {
    console.log(error)
}