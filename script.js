// 确保整个页面加载完毕后再执行我们的代码
document.addEventListener('DOMContentLoaded', function() {

    // --- Supabase 配置 (您的密钥已完美保留) ---
    const SUPABASE_URL = 'https://pduxptbeqfuqbmhrwgfb.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkdXhwdGJlcWZ1cWJtaHJ3Z2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3Mjc3NTIsImV4cCI6MjA3NDMwMzc1Mn0.cwG8j5fHWP8wMQj2d0pHzyyJ70y0Fh0X1rDu1XrSEXk';

    const { createClient } = supabase;
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    if (!supabaseClient) {
        console.error("Supabase 客户端初始化失败！");
        connectionStatus.textContent = '初始化失败';
        connectionStatus.className = 'connection-status disconnected';
        return;
    }

    // --- 获取页面元素 (已更新) ---
    const groupNumberInput = document.getElementById('groupNumber'); // 从 select 变为 input
    const toolsInput = document.getElementById('tools');
    const planInput = document.getElementById('plan');
    const showDataFieldsButton = document.getElementById('showDataFields'); // 新增按钮
    const dataEntrySection = document.getElementById('dataEntrySection'); // 新增的隐藏区域
    const diameterInput = document.getElementById('diameter');
    const circumferenceInput = document.getElementById('circumference');
    const ratioInput = document.getElementById('ratio'); // 新增的比值输入框
    const addDataButton = document.getElementById('addData');
    const dataBody = document.getElementById('dataBody');
    const connectionStatus = document.getElementById('connectionStatus');

    // "结论" 相关的元素和按钮已被移除

    // 全局变量，用于存储当前所有数据
    let experimentData = [];

    // --- 核心应用逻辑 ---

    // 1. 首次加载数据 (无变化)
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

    // 2. 监听实时变化 (无变化)
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
    
    // 3. (新增) 点击按钮显示数据填写区
    showDataFieldsButton.addEventListener('click', () => {
        dataEntrySection.style.display = 'block'; // 显示数据区
        showDataFieldsButton.style.display = 'none'; // 隐藏自己
    });

    // 4. 提交/更新实验数据 (已重写)
    addDataButton.addEventListener('click', async () => {
        const group = groupNumberInput.value.trim(); // 从输入框获取值
        const tools = toolsInput.value;
        const plan = planInput.value;
        const circumference = parseFloat(circumferenceInput.value);
        const diameter = parseFloat(diameterInput.value);
        const ratio = parseFloat(ratioInput.value); // 从新的输入框获取学生自己计算的比值

        // 更新了验证逻辑
        if (!group || !tools || !plan || isNaN(circumference) || isNaN(diameter) || isNaN(ratio)) {
            alert('请填写完整且有效的实验数据！');
            return;
        }
        if (diameter === 0) {
            alert('直径不能为0！');
            return;
        }
        
        // 移除了自动计算比值的代码
        
        const { error } = await supabaseClient
            .from('banji')
            // upsert 现在使用学生填写的 ratio
            .upsert({ group, tools, plan, circumference, diameter, ratio });

        if (error) {
            alert('数据提交失败: ' + error.message);
        } else {
            // 清空所有输入框
            // groupNumberInput.value = ''; // 不清空小组号，方便同一小组修改
            toolsInput.value = '';
            planInput.value = '';
            diameterInput.value = '';
            circumferenceInput.value = '';
            ratioInput.value = ''; // 清空比值输入框
            alert('数据提交成功！已实时同步到所有小组。');
        }
    });

    // 5. "提交/更新结论" 的整个功能已被移除

    // --- 渲染函数 (已更新) ---
    function updateTable() {
        dataBody.innerHTML = '';
        const sortedData = [...experimentData].sort((a, b) => {
             // 简单的数字排序，对 "第X小组" 这样的输入不健壮，但能满足基本需求
            const numA = parseInt(a.group.replace(/[^0-9]/g, '')) || 0;
            const numB = parseInt(b.group.replace(/[^0-9]/g, '')) || 0;
            return numA - numB;
        });
        
        sortedData.forEach(data => {
            const row = document.createElement('tr');
            // 移除了结论相关的代码
            const shortPlan = data.plan && data.plan.length > 20 ? data.plan.substring(0, 20) + '...' : (data.plan || '');
            
            row.innerHTML = `
                <td>${data.group}</td>
                <td>${data.tools || ''}</td>
                <td title="${data.plan || ''}">${shortPlan}</td>
                <td>${data.diameter || ''}</td>
                <td>${data.circumference || ''}</td>
                <td><b>${data.ratio || ''}</b></td>
                <td><button class="delete-btn" data-group="${data.group}">删除</button></td>
            `;
            dataBody.appendChild(row);
        });
        
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const groupToDelete = this.getAttribute('data-group');
                if (confirm(`确定要删除 ${groupToDelete} 的数据吗？`)) {
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
