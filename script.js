// --- Supabase 配置 ---

// 您的专属 URL 和 Key 已经填入
const SUPABASE_URL = 'https://pduxptbeqfuqbmhrwgfb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkdXhwdGJlcWZ1cWJtaHJ3Z2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3Mjc3NTIsImV4cCI6MjA3NDMwMzc1Mn0.cwG8j5fHWP8wMQj2d0pHzyyJ70y0Fh0X1rDu1XrSEXk';

// 创建 Supabase 客户端
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 获取页面元素 (这部分保持不变) ---
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

// 全局变量，用于存储当前所有数据
let experimentData = [];

// --- 核心应用逻辑 ---

// 1. 首次加载数据
async function fetchData() {
    // 【已修正】将表名从 '班级' 改为 'banji'
    const { data, error } = await supabase
        .from('banji') 
        .select('*');

    if (error) {
        console.error('获取数据失败:', error);
    } else {
        experimentData = data;
        updateTable();
    }
}

// 2. 监听实时变化
const channel = supabase.channel('any')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'banji' }, payload => { // 【已修正】
        console.log('收到实时变化!', payload);
        // 收到变化后，重新获取所有数据来刷新表格
        fetchData();
    })
    .subscribe((status) => {
        // 更新连接状态的UI
        if (status === 'SUBSCRIBED') {
            connectionStatus.textContent = '已连接';
            connectionStatus.className = 'connection-status connected';
            console.log('成功连接到实时频道!');
        } else {
            connectionStatus.textContent = '连接中...';
            connectionStatus.className = 'connection-status disconnected';
        }
    });

// 3. 提交/更新实验数据
addDataButton.addEventListener('click', async () => {
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
    
    // 使用 upsert: 如果group存在则更新，不存在则插入
    const { error } = await supabase
        .from('banji') // 【已修正】
        .upsert({ group, tools, plan, circumference, diameter, ratio });

    if (error) {
        alert('数据提交失败: ' + error.message);
    } else {
        toolsInput.value = '';
        planInput.value = '';
        diameterInput.value = '';
        circumferenceInput.value = '';
        alert('数据提交成功！已实时同步到所有小组。');
    }
});

// 4. 提交/更新结论
addConclusionButton.addEventListener('click', async () => {
    const group = groupNumberSelect.value;
    const conclusion = conclusionInput.value;

    if (!group || !conclusion) {
        alert('请选择小组并填写结论！');
        return;
    }
    
    // 使用 update 更新特定小组的结论
    const { error } = await supabase
        .from('banji') // 【已修正】
        .update({ conclusion: conclusion })
        .eq('group', group); // 条件是 group 列等于你选择的小组

    if (error) {
        alert('结论提交失败: ' + error.message);
    } else {
        conclusionInput.value = '';
        alert('结论提交成功！');
    }
});


// --- 渲染函数 ---
function updateTable() {
    dataBody.innerHTML = '';
    
    // 按小组编号排序
    const sortedData = [...experimentData].sort((a, b) => parseInt(a.group) - parseInt(b.group));

    sortedData.forEach(data => {
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
            <td><button class="delete-btn" data-group="${data.group}">删除</button></td>
        `;
        dataBody.appendChild(row);
    });

    // 为新生成的删除按钮添加事件监听
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const groupToDelete = this.getAttribute('data-group');
            if (confirm(`确定要删除第 ${groupToDelete} 小组的数据吗？`)) {
                const { error } = await supabase
                    .from('banji') // 【已修正】
                    .delete()
                    .eq('group', groupToDelete);
                
                if (error) {
                    alert('删除失败: ' + error.message);
                }
            }
        });
    });
}

// --- 启动应用 ---
fetchData();
