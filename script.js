// 确保整个页面加载完毕后再执行我们的代码
document.addEventListener('DOMContentLoaded', function() {

    // --- Supabase 配置 ---
    const SUPABASE_URL = 'https://pduxptbeqfuqbmhrwgfb.supabase.co';
    // 【最终修正】使用了从您那里复制的、100%正确的原始密钥
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkdXhwdGJlcWZ1cWJtaHJ3Z2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3Mjc3NTIsImV4cCI6MjA3NDMwMzc1Mn0.cwG8j5fHWP8wMQj2d0pHzyyJ70y0Fh0X1rDu1XrSEXk';

    // 使用 Supabase V2 的正确初始化方式
    const { createClient } = supabase;
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 如果 supabaseClient 未能正确创建，则停止执行
    if (!supabaseClient) {
        console.error("Supabase 客户端初始化失败！");
        connectionStatus.textContent = '初始化失败';
        connectionStatus.className = 'connection-status disconnected';
        return;
    }

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

    // 全局变量，用于存储当前所有数据
    let experimentData = [];

    // --- 核心应用逻辑 ---

    // 1. 首次加载数据
    async function fetchData() {
        const { data, error } = await supabaseClient
            .from('banji') 
            .select('*');

        if (error) {
            console.error('获取数据失败:', error);
            connectionStatus.textContent = '加载错误';
            connectionStatus.className = 'connection-status disconnected';
        } else {
            experimentData = data;
            updateTable();
        }
    }

    // 2. 监听实时变化
    const channel = supabaseClient.channel('banji-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'banji' }, payload => {
            console.log('收到实时变化!', payload);
            fetchData();
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                connectionStatus.textContent = '已连接';
                connectionStatus.className = 'connection-status connected';
                console.log('成功连接到实时频道!');
                fetchData(); 
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                connectionStatus.textContent = '连接错误';
                connectionStatus.className = 'connection-status disconnected';
                console.error('连接实时频道失败: ', err);
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
        
        const { error } = await supabaseClient
            .from('banji')
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
        
        const { error } = await supabaseClient
            .from('banji')
            .update({ conclusion: conclusion })
            .eq('group', group);

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
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const groupToDelete = this.getAttribute('data-group');
                if (confirm(`确定要删除第 ${groupToDelete} 小组的数据吗？`)) {
                    const { error } = await supabaseClient
                        .from('banji')
                        .delete()
                        .eq('group', groupToDelete);
                    if (error) {
                        alert('删除失败: ' + error.message);
                    }
                }
            });
        });
    }

});
