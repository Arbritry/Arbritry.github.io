// --- Liveblocks 配置 ---
const client = new liveblocks.createClient({
    // 把下面这行替换成你自己的 Public API Key
    publicApiKey: "pk_dev_YOUR_PUBLIC_KEY",
});

// 房间ID，同一个班级的所有学生必须使用同一个ID
const roomId = "math-class-pi-experiment";

// 进入房间
const room = client.enter(roomId, {
    initialStorage: { 
        data: new liveblocks.LiveList() // 使用LiveList来存储共享的数组
    }
});

// --- 获取页面元素 ---
const groupNumberSelect = document.getElementById('groupNumber');
const toolsInput = document.getElementById('tools');
const planInput = document.getElementById('plan');
const diameterInput = document.getElementById('diameter');
const circumferenceInput = document.getElementById('circumference');
const conclusionInput = document.getElementById('conclusionText');
const addDataButton = document.getElementById('addData');
const addConclusionButton = document.getElementById('addConclusion');
const dataBody = document.getElementById('dataBody');
const connectionStatus = document.getElementById('connectionStatus');

// --- 核心应用逻辑 ---
async function startApp() {
    // 等待连接到房间并获取共享的存储对象
    const { root } = await room.getStorage();

    // 当连接状态变化时，更新UI
    room.subscribe("status", (status) => {
        if (status === "connected") {
            connectionStatus.textContent = '已连接';
            connectionStatus.className = 'connection-status connected';
        } else {
            connectionStatus.textContent = '连接中...';
            connectionStatus.className = 'connection-status disconnected';
        }
    });

    // 订阅共享数据(LiveList)的变化
    // 当任何用户修改了数据，这个函数就会被触发
    room.subscribe(root.get("data"), (experimentData) => {
        updateTable(experimentData);
    });

    // 初始化时也渲染一次表格
    updateTable(root.get("data"));

    // --- 事件监听 ---

    // 提交实验数据
    addDataButton.addEventListener('click', () => {
        const group = groupNumberSelect.value;
        const tools = toolsInput.value;
        const plan = planInput.value;
        const circumference = parseFloat(circumferenceInput.value);
        const diameter = parseFloat(diameterInput.value);

        if (!group || !tools || !plan || isNaN(circumference) || isNaN(diameter)) {
            alert('请填写完整且有效的实验数据！');
            return;
        }
        if (diameter === 0) {
            alert('直径不能为0！');
            return;
        }

        const ratio = (circumference / diameter).toFixed(2);
        
        const newData = { group, tools, plan, circumference, diameter, ratio, conclusion: "" };

        // 使用 useMutation 来修改共享数据
        room.history.perform(
            (storage) => {
                const experimentData = storage.root.get("data");
                const existingIndex = experimentData.toArray().findIndex(item => item.group === group);

                if (existingIndex !== -1) {
                    // 如果该组数据已存在，则更新
                    const existingData = experimentData.get(existingIndex);
                    newData.conclusion = existingData.conclusion; // 保留已有的结论
                    experimentData.set(existingIndex, newData);
                } else {
                    // 否则，添加新数据
                    experimentData.push(newData);
                }
            },
            { a: "Updated data for group " + group }
        );

        toolsInput.value = '';
        planInput.value = '';
        diameterInput.value = '';
        circumferenceInput.value = '';
        alert('数据提交成功！已实时同步到所有小组。');
    });

    // 提交结论
    addConclusionButton.addEventListener('click', () => {
        const group = groupNumberSelect.value;
        const conclusion = conclusionInput.value;

        if (!group || !conclusion) {
            alert('请选择小组并填写结论！');
            return;
        }

        room.history.perform((storage) => {
            const experimentData = storage.root.get("data");
            const dataIndex = experimentData.toArray().findIndex(item => item.group === group);
            if (dataIndex === -1) {
                alert('请先提交该小组的实验数据！');
                return;
            }
            const dataToUpdate = experimentData.get(dataIndex);
            dataToUpdate.conclusion = conclusion;
            experimentData.set(dataIndex, dataToUpdate);
        }, { a: "Updated conclusion for group " + group });

        conclusionInput.value = '';
        alert('结论提交成功！');
    });

}

// --- 渲染函数 ---
function updateTable(experimentData) {
    dataBody.innerHTML = '';
    
    // 按小组编号排序 (LiveList.toArray() 转换为普通数组)
    const sortedData = experimentData.toArray().sort((a, b) => parseInt(a.group) - parseInt(b.group));

    sortedData.forEach((data, index) => {
        const row = document.createElement('tr');
        
        const shortPlan = data.plan && data.plan.length > 20 ? data.plan.substring(0, 20) + '...' : (data.plan || '');
        const shortConclusion = data.conclusion && data.conclusion.length > 20 ? data.conclusion.substring(0, 20) + '...' : (data.conclusion || '');

        row.innerHTML = `
            <td>第${data.group}小组</td>
            <td>${data.tools}</td>
            <td title="${data.plan || ''}">${shortPlan}</td>
            <td>${data.diameter}</td>
            <td>${data.circumference}</td>
            <td><b>${data.ratio}</b></td>
            <td title="${data.conclusion || ''}">${shortConclusion}</td>
            <td><button class="delete-btn" data-index="${index}">删除</button></td>
        `;
        dataBody.appendChild(row);
    });

    // 为新生成的删除按钮添加事件监听
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function() {
            if (confirm('确定要删除这条数据吗？')) {
                const indexToDelete = parseInt(this.getAttribute('data-index'));
                room.history.perform((storage) => {
                   storage.root.get("data").delete(indexToDelete);
                }, { a: "Deleted item at index " + indexToDelete });
            }
        });
    });
}

// 启动应用
startApp();
